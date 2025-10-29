/**
 * Delivery Engine for Cerply V2
 * 
 * Implements FSD v2.0 Section 3: Push delivery
 * 
 * Responsibilities:
 * - Send items to Slack/Teams/Web channels
 * - Generate variations for repeated items (fresh wording, same fact)
 * - Respect quiet hours and daily caps
 * - Track delivery status and learner responses
 * - Generate progress cards and nudges
 */

import { db } from '../../db'
import { moduleAssignments, moduleItems, learnerProgress, learnerResponses, auditEvents } from '../../../drizzle/schema_v2'
import { eq, and, sql, gte } from 'drizzle-orm'
import { callModel, ModelJobType } from './model-orchestrator'
import { sendSlackMessage } from '../../adapters/slack'
import { sendTeamsMessage } from '../../adapters/teams'

export interface DeliveryRequest {
  assignmentId: string
  userId: string
  organizationId: string
  itemId: string
  channel: 'slack' | 'teams' | 'web'
  channelId?: string // Slack channel or Teams thread ID
  variation?: boolean // Generate fresh wording?
}

export interface DeliveryResult {
  success: boolean
  deliveryId: string
  messageId?: string
  error?: string
}

export interface ProgressCardData {
  userId: string
  assignmentId: string
  completedCount: number
  totalCount: number
  currentStreak: number
  weakAreas: string[]
  nextItemDue?: Date
}

/**
 * Main delivery engine class
 */
export class DeliveryEngine {
  /**
   * Send an item to the learner via their preferred channel
   */
  async deliverItem(request: DeliveryRequest): Promise<DeliveryResult> {
    try {
      // 1. Check if delivery is allowed (quiet hours, daily cap)
      const canDeliver = await this.checkDeliveryRules(request.userId, request.assignmentId)
      if (!canDeliver.allowed) {
        return {
          success: false,
          deliveryId: '',
          error: canDeliver.reason,
        }
      }

      // 2. Fetch item content
      const item = await db
        .select()
        .from(moduleItems)
        .where(eq(moduleItems.id, request.itemId))
        .limit(1)

      if (item.length === 0) {
        return {
          success: false,
          deliveryId: '',
          error: 'Item not found',
        }
      }

      const itemData = item[0]

      // 3. Generate variation if requested
      let content = itemData.content as any
      if (request.variation) {
        content = await this.generateVariation(itemData, request.organizationId, request.userId)
      }

      // 4. Format message for channel
      const message = this.formatMessage(content, itemData.itemType, request.channel)

      // 5. Send to channel
      let messageId: string | undefined
      if (request.channel === 'slack' && request.channelId) {
        const result = await sendSlackMessage(request.channelId, message)
        messageId = result.ts
      } else if (request.channel === 'teams' && request.channelId) {
        const result = await sendTeamsMessage(request.channelId, message)
        messageId = result.id
      }
      // Web delivery is handled by frontend fetching

      // 6. Log delivery
      const deliveryId = `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await db.insert(auditEvents).values({
        eventType: 'item_delivered',
        userId: request.userId,
        metadata: {
          assignmentId: request.assignmentId,
          itemId: request.itemId,
          channel: request.channel,
          messageId,
          deliveryId,
          variation: request.variation,
        },
      })

      return {
        success: true,
        deliveryId,
        messageId,
      }
    } catch (error) {
      console.error('Delivery error:', error)
      return {
        success: false,
        deliveryId: '',
        error: error instanceof Error ? error.message : 'Unknown delivery error',
      }
    }
  }

  /**
   * Check if delivery is allowed based on quiet hours and daily cap
   */
  private async checkDeliveryRules(
    userId: string,
    assignmentId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Fetch assignment settings
    const assignment = await db
      .select()
      .from(moduleAssignments)
      .where(eq(moduleAssignments.id, assignmentId))
      .limit(1)

    if (assignment.length === 0) {
      return { allowed: false, reason: 'Assignment not found' }
    }

    const settings = assignment[0]

    // Check quiet hours (default 20:00-08:00 in user's timezone)
    const quietHours = (settings.quietHours as any) || { start: '20:00', end: '08:00' }
    const timezone = (settings.metadata as any)?.timezone || 'UTC'

    const now = new Date()
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
    const currentHour = userTime.getHours()
    const currentMinute = userTime.getMinutes()

    const [startHour, startMin] = quietHours.start.split(':').map(Number)
    const [endHour, endMin] = quietHours.end.split(':').map(Number)

    const currentMinutes = currentHour * 60 + currentMinute
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    // Handle overnight quiet hours (e.g., 20:00 to 08:00)
    const inQuietHours =
      startMinutes > endMinutes
        ? currentMinutes >= startMinutes || currentMinutes < endMinutes
        : currentMinutes >= startMinutes && currentMinutes < endMinutes

    if (inQuietHours) {
      return { allowed: false, reason: 'Quiet hours (user preference)' }
    }

    // Check daily cap (default 1-2 mandatory items per day)
    const dailyCap = settings.dailyCap || 2
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayDeliveries = await db
      .select()
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.userId, userId),
          eq(auditEvents.eventType, 'item_delivered'),
          sql`metadata->>'assignmentId' = ${assignmentId}`,
          gte(auditEvents.createdAt, today)
        )
      )

    if (todayDeliveries.length >= dailyCap) {
      return { allowed: false, reason: `Daily cap reached (${dailyCap} items/day)` }
    }

    return { allowed: true }
  }

  /**
   * Generate a variation of an item (fresh wording, same fact)
   */
  private async generateVariation(
    item: any,
    organizationId: string,
    userId: string
  ): Promise<any> {
    const originalContent = item.content as any

    // Use fast model for variation generation
    const prompt = `Generate a variation of this learning item. Keep the same fact/concept but rephrase it with fresh wording.

Original:
Question: ${originalContent.question || originalContent.prompt || ''}
${originalContent.options ? `Options: ${originalContent.options.join(', ')}` : ''}
${originalContent.answer ? `Answer: ${originalContent.answer}` : ''}

Requirements:
1. Same fact/concept, different wording
2. Same difficulty level
3. Same item type (${item.itemType})
4. Keep answer semantically equivalent
5. Plain English, no jargon

Return JSON with same structure as original.`

    try {
      const response = await callModel({
        jobType: ModelJobType.CHAT,
        prompt,
        organizationId,
        userId,
        context: {
          itemId: item.id,
          originalContent,
        },
      })

      // Parse response and validate structure
      const variation = JSON.parse(response.content)
      return variation
    } catch (error) {
      console.error('Variation generation failed, using original:', error)
      return originalContent
    }
  }

  /**
   * Format message for specific channel
   */
  private formatMessage(content: any, itemType: string, channel: 'slack' | 'teams' | 'web'): any {
    // Base message structure
    const message: any = {
      text: content.question || content.prompt || '',
      itemType,
    }

    // Add channel-specific formatting
    if (channel === 'slack') {
      message.blocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${content.question || content.prompt}*`,
          },
        },
      ]

      // Add options if multiple choice
      if (content.options && Array.isArray(content.options)) {
        message.blocks.push({
          type: 'actions',
          elements: content.options.map((opt: string, idx: number) => ({
            type: 'button',
            text: { type: 'plain_text', text: opt },
            value: `option_${idx}`,
            action_id: `answer_${idx}`,
          })),
        })
      } else {
        // Free text - add input prompt
        message.blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '_Reply with your answer or type "Help" for assistance_',
          },
        })
      }
    } else if (channel === 'teams') {
      // Teams adaptive card format
      message.attachments = [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            type: 'AdaptiveCard',
            version: '1.2',
            body: [
              {
                type: 'TextBlock',
                text: content.question || content.prompt,
                weight: 'bolder',
                wrap: true,
              },
            ],
            actions: content.options
              ? content.options.map((opt: string, idx: number) => ({
                  type: 'Action.Submit',
                  title: opt,
                  data: { answer: idx },
                }))
              : [
                  {
                    type: 'Action.Submit',
                    title: 'Submit Answer',
                    data: { action: 'submit' },
                  },
                ],
          },
        },
      ]
    }

    return message
  }

  /**
   * Generate a progress card for the learner
   */
  async generateProgressCard(userId: string, assignmentId: string): Promise<ProgressCardData> {
    // Fetch learner progress
    const progress = await db
      .select()
      .from(learnerProgress)
      .where(and(eq(learnerProgress.userId, userId), eq(learnerProgress.assignmentId, assignmentId)))
      .limit(1)

    if (progress.length === 0) {
      return {
        userId,
        assignmentId,
        completedCount: 0,
        totalCount: 0,
        currentStreak: 0,
        weakAreas: [],
      }
    }

    const state = progress[0]

    // Get total items in module
    const assignment = await db
      .select()
      .from(moduleAssignments)
      .where(eq(moduleAssignments.id, assignmentId))
      .limit(1)

    const moduleId = assignment[0]?.moduleId || ''
    const totalItems = await db
      .select({ count: sql<number>`count(*)` })
      .from(moduleItems)
      .where(eq(moduleItems.moduleId, moduleId))

    // Get completed count
    const completed = await db
      .select({ count: sql<number>`count(distinct ${learnerResponses.moduleItemId})` })
      .from(learnerResponses)
      .where(
        and(
          eq(learnerResponses.userId, userId),
          sql`module_item_id IN (SELECT id FROM module_items WHERE module_id = ${moduleId})`,
          eq(learnerResponses.isCorrect, true)
        )
      )

    // Calculate current streak
    const recentResponses = await db
      .select()
      .from(learnerResponses)
      .where(eq(learnerResponses.userId, userId))
      .orderBy(sql`${learnerResponses.createdAt} DESC`)
      .limit(20)

    let streak = 0
    for (const response of recentResponses) {
      if (response.isCorrect) {
        streak++
      } else {
        break
      }
    }

    return {
      userId,
      assignmentId,
      completedCount: Number(completed[0]?.count || 0),
      totalCount: Number(totalItems[0]?.count || 0),
      currentStreak: streak,
      weakAreas: (state.weakAreas as any[]) || [],
      nextItemDue: state.nextItemDue,
    }
  }

  /**
   * Send a nudge to learner (reminder to continue learning)
   */
  async sendNudge(
    userId: string,
    assignmentId: string,
    channel: 'slack' | 'teams' | 'web',
    channelId?: string
  ): Promise<DeliveryResult> {
    const progressCard = await this.generateProgressCard(userId, assignmentId)

    const message =
      channel === 'slack'
        ? {
            text: `👋 Time to continue your learning!`,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Progress Update*\n\n✅ ${progressCard.completedCount}/${progressCard.totalCount} items completed\n🔥 ${progressCard.currentStreak} day streak\n\nReady for your next question?`,
                },
              },
              {
                type: 'actions',
                elements: [
                  {
                    type: 'button',
                    text: { type: 'plain_text', text: 'Continue Learning' },
                    value: 'continue',
                    action_id: 'continue_learning',
                    style: 'primary',
                  },
                ],
              },
            ],
          }
        : {
            text: `👋 Progress: ${progressCard.completedCount}/${progressCard.totalCount} | Streak: ${progressCard.currentStreak} days. Ready to continue?`,
          }

    try {
      let messageId: string | undefined
      if (channel === 'slack' && channelId) {
        const result = await sendSlackMessage(channelId, message)
        messageId = result.ts
      } else if (channel === 'teams' && channelId) {
        const result = await sendTeamsMessage(channelId, message)
        messageId = result.id
      }

      // Log nudge
      const deliveryId = `nudge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await db.insert(auditEvents).values({
        eventType: 'nudge_sent',
        userId,
        metadata: {
          assignmentId,
          channel,
          messageId,
          deliveryId,
          progressCard,
        },
      })

      return {
        success: true,
        deliveryId,
        messageId,
      }
    } catch (error) {
      console.error('Nudge error:', error)
      return {
        success: false,
        deliveryId: '',
        error: error instanceof Error ? error.message : 'Unknown nudge error',
      }
    }
  }
}

// Singleton instance
export const deliveryEngine = new DeliveryEngine()

// Helper functions for routes
export async function deliverItemToLearner(request: DeliveryRequest): Promise<DeliveryResult> {
  return deliveryEngine.deliverItem(request)
}

export async function sendNudgeToLearner(
  userId: string,
  assignmentId: string,
  channel: 'slack' | 'teams' | 'web',
  channelId?: string
): Promise<DeliveryResult> {
  return deliveryEngine.sendNudge(userId, assignmentId, channel, channelId)
}

export async function getProgressCard(userId: string, assignmentId: string): Promise<ProgressCardData> {
  return deliveryEngine.generateProgressCard(userId, assignmentId)
}

