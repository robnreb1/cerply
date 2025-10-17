/**
 * Agent Memory Service
 * Epic 13: Conversation history and state management
 * 
 * Manages 30-day conversation history, decision points, and context windows.
 * Provides conversation continuity across sessions.
 */

import { db } from '../db';
import { agentConversations, agentToolCalls } from '../db/schema';
import { eq, inArray, desc, lt, sql } from 'drizzle-orm';
import type { AgentMessage } from './agent-orchestrator';

export class AgentMemory {
  /**
   * Store a message in conversation history
   */
  async storeMessage(
    userId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    toolCalls?: any
  ): Promise<void> {
    try {
      await db
        .insert(agentConversations)
        .values({
          userId,
          role,
          content,
          toolCalls: toolCalls || null,
          timestamp: new Date(),
          createdAt: new Date(),
        });
    } catch (error: any) {
      console.error('[AgentMemory] Error storing message:', error.message);
      // Don't throw - memory storage failure shouldn't break conversation
    }
  }

  /**
   * Get conversation history for a user (most recent first)
   * Default: Last 6 messages for context window
   */
  async getConversationHistory(
    userId: string,
    limit: number = 6
  ): Promise<AgentMessage[]> {
    try {
      const rows = await db
        .select()
        .from(agentConversations)
        .where(
          sql`${agentConversations.userId} = ${userId} AND ${agentConversations.role} IN ('user', 'assistant')`
        )
        .orderBy(desc(agentConversations.timestamp))
        .limit(limit);

      // Reverse to get chronological order (oldest first)
      return rows.reverse().map((row: any) => ({
        role: row.role as 'user' | 'assistant',
        content: row.content,
        tool_calls: row.toolCalls ? (row.toolCalls as any) : undefined,
      }));
    } catch (error: any) {
      console.error('[AgentMemory] Error retrieving history:', error.message);
      return []; // Return empty history on error
    }
  }

  /**
   * Store a decision point in the conversation
   * Used for analytics and debugging
   */
  async storeDecisionPoint(
    userId: string,
    decision: string,
    data: any = {}
  ): Promise<void> {
    try {
      await db
        .insert(agentConversations)
        .values({
          userId,
          role: 'system',
          content: `DECISION: ${decision}`,
          toolCalls: data,
          timestamp: new Date(),
          createdAt: new Date(),
        });
    } catch (error: any) {
      console.error('[AgentMemory] Error storing decision point:', error.message);
    }
  }

  /**
   * Store a tool call execution (for audit trail)
   */
  async storeToolCall(
    userId: string,
    toolName: string,
    parameters: any,
    result: any,
    executionTimeMs: number,
    error?: string
  ): Promise<void> {
    try {
      await db
        .insert(agentToolCalls)
        .values({
          userId,
          toolName,
          parameters,
          result,
          executionTimeMs,
          error: error || null,
          timestamp: new Date(),
        });
    } catch (error: any) {
      console.error('[AgentMemory] Error storing tool call:', error.message);
    }
  }

  /**
   * Clear conversation history for a user (reset)
   */
  async clearConversation(userId: string): Promise<void> {
    try {
      // Delete conversation messages
      await db
        .delete(agentConversations)
        .where(eq(agentConversations.userId, userId));

      // Optionally also clear tool calls (for complete reset)
      await db
        .delete(agentToolCalls)
        .where(eq(agentToolCalls.userId, userId));

      console.log(`[AgentMemory] Cleared conversation for user: ${userId}`);
    } catch (error: any) {
      console.error('[AgentMemory] Error clearing conversation:', error.message);
      throw error;
    }
  }

  /**
   * Get tool call history for a user (for debugging/analytics)
   */
  async getToolCallHistory(
    userId: string,
    limit: number = 20
  ): Promise<any[]> {
    try {
      const rows = await db
        .select()
        .from(agentToolCalls)
        .where(eq(agentToolCalls.userId, userId))
        .orderBy(desc(agentToolCalls.timestamp))
        .limit(limit);

      return rows;
    } catch (error: any) {
      console.error('[AgentMemory] Error retrieving tool call history:', error.message);
      return [];
    }
  }

  /**
   * Get conversation statistics for a user
   */
  async getConversationStats(userId: string): Promise<{
    messageCount: number;
    toolCallCount: number;
    lastActivity: Date | null;
    averageToolExecutionTime: number | null;
  }> {
    try {
      // Count messages - using raw SQL for count
      const messageCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(agentConversations)
        .where(
          sql`${agentConversations.userId} = ${userId} AND ${agentConversations.role} IN ('user', 'assistant')`
        );

      // Count tool calls and get avg execution time
      const toolStatsResult = await db
        .select({
          count: sql<number>`count(*)`,
          avgTime: sql<number>`avg(${agentToolCalls.executionTimeMs})`,
        })
        .from(agentToolCalls)
        .where(eq(agentToolCalls.userId, userId));

      // Get last activity
      const lastActivityResult = await db
        .select({ timestamp: agentConversations.timestamp })
        .from(agentConversations)
        .where(eq(agentConversations.userId, userId))
        .orderBy(desc(agentConversations.timestamp))
        .limit(1);

      return {
        messageCount: Number(messageCountResult[0]?.count || 0),
        toolCallCount: Number(toolStatsResult[0]?.count || 0),
        lastActivity: lastActivityResult[0]?.timestamp || null,
        averageToolExecutionTime: toolStatsResult[0]?.avgTime
          ? Math.round(Number(toolStatsResult[0].avgTime))
          : null,
      };
    } catch (error: any) {
      console.error('[AgentMemory] Error getting conversation stats:', error.message);
      return {
        messageCount: 0,
        toolCallCount: 0,
        lastActivity: null,
        averageToolExecutionTime: null,
      };
    }
  }

  /**
   * Clean up old conversations (30-day retention)
   * Should be run as a scheduled job
   */
  async cleanupOldConversations(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Delete old conversation messages
      await db
        .delete(agentConversations)
        .where(lt(agentConversations.timestamp, thirtyDaysAgo));

      // Delete old tool calls
      await db
        .delete(agentToolCalls)
        .where(lt(agentToolCalls.timestamp, thirtyDaysAgo));

      console.log(`[AgentMemory] Cleaned up old records (30+ days)`);
      return 0; // Drizzle doesn't return row count easily
    } catch (error: any) {
      console.error('[AgentMemory] Error cleaning up old conversations:', error.message);
      return 0;
    }
  }
}

