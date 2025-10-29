/**
 * Learn Interactions for Cerply V2
 * 
 * Implements FSD v2.0 Section 3: Learner interactions
 * 
 * Responsibilities:
 * - Parse natural language answers (free text)
 * - Handle "Help", "Challenge", "Skip" commands
 * - Score answers (binary + partial credit)
 * - Generate progress cards
 * - Provide hints and explanations
 * - Detect follow-up questions
 */

import { db } from '../db'
import { learnerResponses, moduleItems, learnerProgress, auditEvents } from '../../drizzle/schema_v2'
import { eq, and, sql } from 'drizzle-orm'
import { callModel, ModelJobType } from './model-orchestrator'
import { adjustDifficulty, planNextSession } from './adaptive-engine-v2'

export interface AnswerSubmission {
  userId: string
  organizationId: string
  assignmentId: string
  itemId: string
  answer: string // Free text or selected option
  itemType: 'multiple_choice' | 'free_text' | 'true_false' | 'scenario'
  timeSpentSeconds: number
}

export interface AnswerResult {
  isCorrect: boolean
  partialCredit: number // 0.0 to 1.0
  feedback: string
  explanation?: string
  nextItemId?: string
  progressUpdate?: {
    newLevel: number
    streakCount: number
  }
}

export interface HelpRequest {
  userId: string
  organizationId: string
  itemId: string
  helpType: 'hint' | 'explanation' | 'example'
}

export interface ChallengeRequest {
  userId: string
  organizationId: string
  assignmentId: string
  challengeType: 'harder' | 'related' | 'weak_area'
}

/**
 * Learn interactions service
 */
export class LearnInteractions {
  /**
   * Submit and score an answer
   */
  async submitAnswer(submission: AnswerSubmission): Promise<AnswerResult> {
    try {
      // 1. Fetch item and correct answer
      const item = await db
        .select()
        .from(moduleItems)
        .where(eq(moduleItems.id, submission.itemId))
        .limit(1)

      if (item.length === 0) {
        throw new Error('Item not found')
      }

      const itemData = item[0]
      const content = itemData.content as any

      // 2. Score the answer
      const scoring = await this.scoreAnswer(submission, content, itemData.itemType)

      // 3. Record response
      await db.insert(learnerResponses).values({
        userId: submission.userId,
        assignmentId: submission.assignmentId,
        moduleItemId: submission.itemId,
        response: submission.answer,
        isCorrect: scoring.isCorrect,
        partialCredit: scoring.partialCredit,
        timeSpentSeconds: submission.timeSpentSeconds,
        metadata: {
          itemType: submission.itemType,
          feedback: scoring.feedback,
        },
      })

      // 4. Update learner progress (adaptive difficulty)
      const newState = await adjustDifficulty(
        submission.userId,
        submission.assignmentId,
        scoring.isCorrect,
        submission.timeSpentSeconds
      )

      // 5. Plan next item
      const nextSession = await planNextSession(submission.userId, submission.assignmentId)

      // 6. Log interaction
      await db.insert(auditEvents).values({
        eventType: 'answer_submitted',
        userId: submission.userId,
        metadata: {
          itemId: submission.itemId,
          assignmentId: submission.assignmentId,
          isCorrect: scoring.isCorrect,
          partialCredit: scoring.partialCredit,
          timeSpent: submission.timeSpentSeconds,
        },
      })

      return {
        isCorrect: scoring.isCorrect,
        partialCredit: scoring.partialCredit,
        feedback: scoring.feedback,
        explanation: scoring.explanation,
        nextItemId: nextSession.items[0]?.id,
        progressUpdate: {
          newLevel: newState.currentLevel,
          streakCount: newState.streakCount,
        },
      }
    } catch (error) {
      console.error('Answer submission error:', error)
      throw error
    }
  }

  /**
   * Score an answer (binary + partial credit)
   */
  private async scoreAnswer(
    submission: AnswerSubmission,
    correctContent: any,
    itemType: string
  ): Promise<{
    isCorrect: boolean
    partialCredit: number
    feedback: string
    explanation?: string
  }> {
    // Multiple choice - exact match
    if (itemType === 'multiple_choice' || itemType === 'true_false') {
      const correctAnswer = correctContent.correctAnswer || correctContent.answer
      const isCorrect = submission.answer.trim().toLowerCase() === correctAnswer.toString().toLowerCase()

      return {
        isCorrect,
        partialCredit: isCorrect ? 1.0 : 0.0,
        feedback: isCorrect ? 'Correct! Well done.' : `Not quite. The correct answer is: ${correctAnswer}`,
        explanation: correctContent.explanation,
      }
    }

    // Free text - use LLM to score
    if (itemType === 'free_text' || itemType === 'scenario') {
      const prompt = `Score this learner's answer. Award partial credit for partially correct answers.

Question: ${correctContent.question || correctContent.prompt}
Correct answer: ${correctContent.answer || correctContent.acceptableCriteria}
Learner's answer: ${submission.answer}

Scoring rules:
1. Full credit (1.0): Complete and accurate
2. Partial credit (0.5-0.9): Mostly correct, minor gaps
3. Low credit (0.1-0.4): Some correct elements, significant gaps
4. No credit (0.0): Incorrect or off-topic

Return JSON:
{
  "isCorrect": boolean (true if >= 0.7),
  "partialCredit": number (0.0 to 1.0),
  "feedback": "Brief feedback for learner",
  "explanation": "Why this is the correct answer"
}`

      try {
        const response = await callModel({
          jobType: ModelJobType.CHAT,
          prompt,
          organizationId: submission.organizationId,
          userId: submission.userId,
          context: {
            itemId: submission.itemId,
          },
        })

        const scoring = JSON.parse(response.content)
        return {
          isCorrect: scoring.partialCredit >= 0.7, // 70% threshold
          partialCredit: scoring.partialCredit,
          feedback: scoring.feedback,
          explanation: scoring.explanation,
        }
      } catch (error) {
        console.error('LLM scoring failed:', error)
        // Fallback: simple keyword matching
        const keywords = (correctContent.keywords || []) as string[]
        const answerLower = submission.answer.toLowerCase()
        const matchedKeywords = keywords.filter((k: string) => answerLower.includes(k.toLowerCase()))
        const partialCredit = keywords.length > 0 ? matchedKeywords.length / keywords.length : 0.5

        return {
          isCorrect: partialCredit >= 0.7,
          partialCredit,
          feedback: partialCredit >= 0.7 ? 'Good answer!' : 'Partially correct. Review the explanation.',
          explanation: correctContent.explanation,
        }
      }
    }

    // Default fallback
    return {
      isCorrect: false,
      partialCredit: 0.0,
      feedback: 'Unable to score answer. Please contact support.',
    }
  }

  /**
   * Handle "Help" command - provide hint or explanation
   */
  async provideHelp(request: HelpRequest): Promise<string> {
    // Fetch item
    const item = await db.select().from(moduleItems).where(eq(moduleItems.id, request.itemId)).limit(1)

    if (item.length === 0) {
      return 'Sorry, I could not find that item.'
    }

    const content = item[0].content as any

    // Log help request
    await db.insert(auditEvents).values({
      eventType: 'help_requested',
      userId: request.userId,
      metadata: {
        itemId: request.itemId,
        helpType: request.helpType,
      },
    })

    // Return pre-made hint or generate one
    if (request.helpType === 'hint' && content.hint) {
      return `💡 Hint: ${content.hint}`
    }

    if (request.helpType === 'explanation' && content.explanation) {
      return `📖 Explanation: ${content.explanation}`
    }

    // Generate dynamic hint using LLM
    const prompt = `Provide a helpful ${request.helpType} for this learning item without giving away the answer.

Question: ${content.question || content.prompt}
${content.context ? `Context: ${content.context}` : ''}

Return a brief, encouraging ${request.helpType} that guides the learner toward the answer.`

    try {
      const response = await callModel({
        jobType: ModelJobType.CHAT,
        prompt,
        organizationId: request.organizationId,
        userId: request.userId,
        context: {
          itemId: request.itemId,
        },
      })

      return `💡 ${response.content}`
    } catch (error) {
      console.error('Help generation failed:', error)
      return 'Try breaking down the question into smaller parts and thinking about each one.'
    }
  }

  /**
   * Handle "Challenge" command - provide a harder or related item
   */
  async provideChallengeItem(request: ChallengeRequest): Promise<{ itemId: string; rationale: string }> {
    // Fetch learner state
    const state = await db
      .select()
      .from(learnerProgress)
      .where(and(eq(learnerProgress.userId, request.userId), eq(learnerProgress.assignmentId, request.assignmentId)))
      .limit(1)

    if (state.length === 0) {
      throw new Error('Learner progress not found')
    }

    const currentLevel = state[0].currentLevel

    // Log challenge request
    await db.insert(auditEvents).values({
      eventType: 'challenge_requested',
      userId: request.userId,
      metadata: {
        assignmentId: request.assignmentId,
        challengeType: request.challengeType,
        currentLevel,
      },
    })

    // Find item based on challenge type
    if (request.challengeType === 'harder') {
      // Get item 2+ levels above current
      const targetDifficulty = Math.min(10, currentLevel + 2)
      const harderItems = await db
        .select()
        .from(moduleItems)
        .where(
          and(
            sql`module_id IN (SELECT module_id FROM module_assignments WHERE id = ${request.assignmentId})`,
            sql`(metadata->>'difficulty')::int >= ${targetDifficulty}`
          )
        )
        .limit(5)

      if (harderItems.length > 0) {
        const randomItem = harderItems[Math.floor(Math.random() * harderItems.length)]
        return {
          itemId: randomItem.id,
          rationale: `💪 Challenge accepted! This is a level ${targetDifficulty} item.`,
        }
      }
    }

    if (request.challengeType === 'weak_area') {
      // Get item from weak areas
      const weakAreas = (state[0].weakAreas as any[]) || []
      if (weakAreas.length > 0) {
        const weakGoalId = weakAreas[0].goalId
        const weakItems = await db
          .select()
          .from(moduleItems)
          .where(
            and(
              sql`module_id IN (SELECT module_id FROM module_assignments WHERE id = ${request.assignmentId})`,
              sql`${weakGoalId} = ANY(goal_tags)`
            )
          )
          .limit(5)

        if (weakItems.length > 0) {
          const randomItem = weakItems[Math.floor(Math.random() * weakItems.length)]
          return {
            itemId: randomItem.id,
            rationale: `🎯 Let's strengthen this area: ${weakAreas[0].goalName}`,
          }
        }
      }
    }

    // Fallback: just get next appropriate item
    const nextSession = await planNextSession(request.userId, request.assignmentId)
    if (nextSession.items.length > 0) {
      return {
        itemId: nextSession.items[0].id,
        rationale: 'Here is a good challenge for you!',
      }
    }

    throw new Error('No challenge items available')
  }

  /**
   * Parse natural language command (Help, Challenge, Skip, etc.)
   */
  async parseCommand(
    userId: string,
    organizationId: string,
    assignmentId: string,
    currentItemId: string,
    message: string
  ): Promise<{
    command: 'help' | 'challenge' | 'skip' | 'progress' | 'answer' | 'unknown'
    response?: string
    nextItemId?: string
  }> {
    const messageLower = message.trim().toLowerCase()

    // Help command
    if (messageLower.includes('help') || messageLower.includes('hint') || messageLower.includes('stuck')) {
      const helpText = await this.provideHelp({
        userId,
        organizationId,
        itemId: currentItemId,
        helpType: messageLower.includes('explain') ? 'explanation' : 'hint',
      })
      return {
        command: 'help',
        response: helpText,
      }
    }

    // Challenge command
    if (messageLower.includes('challenge') || messageLower.includes('harder')) {
      const challenge = await this.provideChallengeItem({
        userId,
        organizationId,
        assignmentId,
        challengeType: 'harder',
      })
      return {
        command: 'challenge',
        response: challenge.rationale,
        nextItemId: challenge.itemId,
      }
    }

    // Skip command
    if (messageLower.includes('skip') || messageLower.includes('next')) {
      const nextSession = await planNextSession(userId, assignmentId)
      return {
        command: 'skip',
        response: 'Okay, moving to the next item.',
        nextItemId: nextSession.items[0]?.id,
      }
    }

    // Progress command
    if (messageLower.includes('progress') || messageLower.includes('how am i doing')) {
      const progressCard = await this.generateProgressSummary(userId, assignmentId)
      return {
        command: 'progress',
        response: progressCard,
      }
    }

    // Default: treat as answer
    return {
      command: 'answer',
    }
  }

  /**
   * Generate a progress summary for the learner
   */
  private async generateProgressSummary(userId: string, assignmentId: string): Promise<string> {
    const progress = await db
      .select()
      .from(learnerProgress)
      .where(and(eq(learnerProgress.userId, userId), eq(learnerProgress.assignmentId, assignmentId)))
      .limit(1)

    if (progress.length === 0) {
      return 'No progress yet. Keep going!'
    }

    const state = progress[0]

    // Get completed count
    const completedCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(learnerResponses)
      .where(and(eq(learnerResponses.userId, userId), eq(learnerResponses.assignmentId, assignmentId), eq(learnerResponses.isCorrect, true)))

    const weakAreas = (state.weakAreas as any[]) || []

    return `
📊 Your Progress:
✅ Completed: ${completedCount[0]?.count || 0} items
📈 Current level: ${state.currentLevel}/10
🔥 Streak: ${state.streakCount} days
${weakAreas.length > 0 ? `\n🎯 Areas to strengthen: ${weakAreas.slice(0, 2).map((w: any) => w.goalName).join(', ')}` : ''}

Keep up the great work!
    `.trim()
  }
}

// Singleton instance
export const learnInteractions = new LearnInteractions()

// Helper functions for routes
export async function submitLearnerAnswer(submission: AnswerSubmission): Promise<AnswerResult> {
  return learnInteractions.submitAnswer(submission)
}

export async function requestHelp(request: HelpRequest): Promise<string> {
  return learnInteractions.provideHelp(request)
}

export async function requestChallenge(request: ChallengeRequest): Promise<{ itemId: string; rationale: string }> {
  return learnInteractions.provideChallengeItem(request)
}

export async function parseNaturalLanguageCommand(
  userId: string,
  organizationId: string,
  assignmentId: string,
  currentItemId: string,
  message: string
): Promise<{
  command: 'help' | 'challenge' | 'skip' | 'progress' | 'answer' | 'unknown'
  response?: string
  nextItemId?: string
}> {
  return learnInteractions.parseCommand(userId, organizationId, assignmentId, currentItemId, message)
}

