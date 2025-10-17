/**
 * Conversation Memory Service
 * Manages conversation storage and 30-day retention policy
 * Extracts and preserves decision points after pruning
 */

import { db } from '../db';
import { userConversations, userWorkflowDecisions } from '../db/schema';
import { eq, and, lt, desc } from 'drizzle-orm';

interface ConversationMessage {
  role: string;
  content: string;
  timestamp: string;
}

/**
 * Store or update a conversation
 * Updates lastActive timestamp on each call
 */
export async function storeConversation(
  userId: string,
  conversationId: string,
  messages: ConversationMessage[],
  workflowId: string
): Promise<void> {
  try {
    // Check if conversation exists
    const existing = await db
      .select()
      .from(userConversations)
      .where(eq(userConversations.conversationId, conversationId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing conversation
      await db
        .update(userConversations)
        .set({
          messages,
          lastActive: new Date(),
        })
        .where(eq(userConversations.conversationId, conversationId));
    } else {
      // Insert new conversation
      await db.insert(userConversations).values({
        userId,
        conversationId,
        messages,
        workflowId,
        lastActive: new Date(),
      });
    }
  } catch (error) {
    console.error('[conversation-memory] Failed to store conversation:', error);
    throw new Error('CONVERSATION_STORE_FAILED');
  }
}

/**
 * Store a workflow decision point
 * These are preserved permanently for profile building
 */
export async function storeWorkflowDecision(
  userId: string,
  workflowId: string,
  decisionPoint: string,
  data: any
): Promise<void> {
  try {
    await db.insert(userWorkflowDecisions).values({
      userId,
      workflowId,
      decisionPoint,
      data,
    });
  } catch (error) {
    console.error('[conversation-memory] Failed to store decision:', error);
    throw new Error('DECISION_STORE_FAILED');
  }
}

/**
 * Get recent conversations for a user
 * Default: last 30 days
 */
export async function getRecentConversations(
  userId: string,
  daysBack: number = 30
): Promise<any[]> {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);

    const conversations = await db
      .select()
      .from(userConversations)
      .where(
        and(
          eq(userConversations.userId, userId),
          lt(userConversations.lastActive, cutoff)
        )
      )
      .orderBy(desc(userConversations.lastActive));

    return conversations;
  } catch (error) {
    console.error('[conversation-memory] Failed to fetch conversations:', error);
    return [];
  }
}

/**
 * Get a specific conversation by ID
 */
export async function getConversation(conversationId: string): Promise<any | null> {
  try {
    const conversations = await db
      .select()
      .from(userConversations)
      .where(eq(userConversations.conversationId, conversationId))
      .limit(1);

    return conversations.length > 0 ? conversations[0] : null;
  } catch (error) {
    console.error('[conversation-memory] Failed to fetch conversation:', error);
    return null;
  }
}

/**
 * Prune old conversations (30+ days)
 * Extract decision points before deleting
 * This should be run as a background cron job
 */
export async function pruneOldConversations(): Promise<{
  pruned: number;
  decisionsExtracted: number;
}> {
  let prunedCount = 0;
  let decisionsCount = 0;

  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    // Find old conversations
    const oldConversations = await db
      .select()
      .from(userConversations)
      .where(lt(userConversations.lastActive, cutoff));

    console.log(`[conversation-memory] Found ${oldConversations.length} conversations to prune`);

    // Process each conversation
    for (const conv of oldConversations) {
      // Extract decision points from messages
      const decisionPoints = extractDecisionPoints(conv.messages as ConversationMessage[], conv.workflowId);

      // Store each decision point
      for (const dp of decisionPoints) {
        await storeWorkflowDecision(
          conv.userId,
          conv.workflowId,
          dp.point,
          dp.data
        );
        decisionsCount++;
      }

      // Delete the full conversation
      await db
        .delete(userConversations)
        .where(eq(userConversations.id, conv.id));
      prunedCount++;
    }

    console.log(`[conversation-memory] Pruned ${prunedCount} conversations, extracted ${decisionsCount} decisions`);

    return { pruned: prunedCount, decisionsExtracted: decisionsCount };
  } catch (error) {
    console.error('[conversation-memory] Pruning failed:', error);
    throw new Error('CONVERSATION_PRUNE_FAILED');
  }
}

/**
 * Extract decision points from conversation messages
 * Decision points are key moments where user made a choice:
 * - Confirmed a topic
 * - Selected a subject
 * - Refined their understanding
 * - Started a module
 */
function extractDecisionPoints(
  messages: ConversationMessage[],
  workflowId: string
): Array<{ point: string; data: any }> {
  const decisionPoints: Array<{ point: string; data: any }> = [];

  // Look for confirmation patterns
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    
    if (msg.role === 'user') {
      const content = msg.content.toLowerCase();
      
      // Affirmative confirmation
      const affirmativePatterns = /^(yes|yep|yeah|yup|sure|ok|okay|correct|right|that's right|exactly|absolutely|definitely|go ahead|proceed|start|begin)/i;
      if (affirmativePatterns.test(content)) {
        // Look at previous assistant message for context
        if (i > 0 && messages[i - 1].role === 'assistant') {
          decisionPoints.push({
            point: 'confirmed_understanding',
            data: {
              userConfirmation: msg.content,
              assistantQuestion: messages[i - 1].content,
              timestamp: msg.timestamp,
            },
          });
        }
      }
      
      // Topic selection (if message contains specific keywords)
      if (content.includes('teach me') || content.includes('learn about') || content.includes('want to learn')) {
        decisionPoints.push({
          point: 'requested_topic',
          data: {
            userRequest: msg.content,
            timestamp: msg.timestamp,
          },
        });
      }
    }
  }

  return decisionPoints;
}

/**
 * Get user's workflow decisions for profile building
 */
export async function getUserDecisions(
  userId: string,
  workflowId?: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const whereConditions = workflowId
      ? and(
          eq(userWorkflowDecisions.userId, userId),
          eq(userWorkflowDecisions.workflowId, workflowId)
        )
      : eq(userWorkflowDecisions.userId, userId);

    const decisions = await db
      .select()
      .from(userWorkflowDecisions)
      .where(whereConditions)
      .orderBy(desc(userWorkflowDecisions.timestamp))
      .limit(limit);

    return decisions;
  } catch (error) {
    console.error('[conversation-memory] Failed to fetch decisions:', error);
    return [];
  }
}

