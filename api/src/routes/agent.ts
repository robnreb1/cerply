/**
 * Agent API Routes
 * Epic 13: Agent orchestrator endpoints
 * 
 * Provides REST API for agent-based conversational learning.
 * Feature-flagged with FF_AGENT_ORCHESTRATOR_V1
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getAgentOrchestrator } from '../services/agent-orchestrator';
import { registerDefaultTools } from '../services/agent-tools';

// Initialize orchestrator with default tools (singleton)
const orchestrator = getAgentOrchestrator();
registerDefaultTools(orchestrator);

interface ChatRequest {
  userId: string;
  message: string;
  conversationHistory?: any[];
}

interface UserIdParams {
  userId: string;
}

export async function registerAgentRoutes(app: FastifyInstance) {
  /**
   * POST /api/agent/chat
   * Main chat endpoint - processes user message with agent reasoning
   */
  app.post<{ Body: ChatRequest }>(
    '/api/agent/chat',
    async (req: FastifyRequest<{ Body: ChatRequest }>, reply: FastifyReply) => {
      try {
        // Check feature flag
        if (process.env.FF_AGENT_ORCHESTRATOR_V1 !== 'true') {
          return reply.status(403).send({
            error: {
              code: 'FEATURE_NOT_ENABLED',
              message: 'Agent orchestrator is not enabled. Set FF_AGENT_ORCHESTRATOR_V1=true',
            },
          });
        }

        const { userId, message, conversationHistory = [] } = req.body;

        // Validation
        if (!userId || typeof userId !== 'string') {
          return reply.status(400).send({
            error: {
              code: 'INVALID_USER_ID',
              message: 'userId is required and must be a string',
            },
          });
        }

        if (!message || typeof message !== 'string') {
          return reply.status(400).send({
            error: {
              code: 'INVALID_MESSAGE',
              message: 'message is required and must be a string',
            },
          });
        }

        // Process with agent
        const response = await orchestrator.chat(userId, message, conversationHistory);

        // Check if agent signaled content generation
        const generationTool = response.toolCalls.find(
          tc => tc.toolName === 'generateContent' && tc.result?.action === 'START_GENERATION'
        );

        if (generationTool) {
          // Return special response indicating generation should start
          return reply.send({
            message: response.message,
            action: 'START_GENERATION',
            topic: generationTool.result.topic,
            granularity: generationTool.result.granularity,
            conversationHistory: response.conversationHistory,
            metadata: response.metadata,
          });
        }

        // Standard response
        return reply.send({
          message: response.message,
          toolCalls: response.toolCalls.map(tc => ({
            tool: tc.toolName,
            timestamp: tc.timestamp,
          })),
          conversationHistory: response.conversationHistory,
          metadata: response.metadata,
        });
      } catch (error: any) {
        console.error('[Agent API] Error in /chat:', error);
        return reply.status(500).send({
          error: {
            code: 'AGENT_ERROR',
            message: error.message || 'Failed to process message',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          },
        });
      }
    }
  );

  /**
   * GET /api/agent/memory/:userId
   * Retrieve conversation history for a user
   */
  app.get<{ Params: UserIdParams; Querystring: { limit?: string } }>(
    '/api/agent/memory/:userId',
    async (req: FastifyRequest<{ Params: UserIdParams; Querystring: { limit?: string } }>, reply: FastifyReply) => {
      try {
        // Check feature flag
        if (process.env.FF_AGENT_ORCHESTRATOR_V1 !== 'true') {
          return reply.status(403).send({
            error: {
              code: 'FEATURE_NOT_ENABLED',
              message: 'Agent orchestrator is not enabled',
            },
          });
        }

        const userId = req.params.userId;
        const limit = parseInt(req.query.limit || '20', 10);

        if (!userId) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_USER_ID',
              message: 'userId is required',
            },
          });
        }

        const history = await orchestrator.getHistory(userId, limit);

        return reply.send({
          userId,
          history,
          count: history.length,
        });
      } catch (error: any) {
        console.error('[Agent API] Error in /memory/:userId:', error);
        return reply.status(500).send({
          error: {
            code: 'MEMORY_ERROR',
            message: error.message || 'Failed to retrieve conversation history',
          },
        });
      }
    }
  );

  /**
   * POST /api/agent/reset/:userId
   * Clear conversation history for a user
   */
  app.post<{ Params: UserIdParams }>(
    '/api/agent/reset/:userId',
    async (req: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) => {
      try {
        // Check feature flag
        if (process.env.FF_AGENT_ORCHESTRATOR_V1 !== 'true') {
          return reply.status(403).send({
            error: {
              code: 'FEATURE_NOT_ENABLED',
              message: 'Agent orchestrator is not enabled',
            },
          });
        }

        const userId = req.params.userId;

        if (!userId) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_USER_ID',
              message: 'userId is required',
            },
          });
        }

        await orchestrator.reset(userId);

        return reply.send({
          success: true,
          message: `Conversation history cleared for user: ${userId}`,
        });
      } catch (error: any) {
        console.error('[Agent API] Error in /reset/:userId:', error);
        return reply.status(500).send({
          error: {
            code: 'RESET_ERROR',
            message: error.message || 'Failed to reset conversation',
          },
        });
      }
    }
  );

  /**
   * GET /api/agent/stats/:userId
   * Get conversation statistics for a user
   */
  app.get<{ Params: UserIdParams }>(
    '/api/agent/stats/:userId',
    async (req: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) => {
      try {
        // Check feature flag
        if (process.env.FF_AGENT_ORCHESTRATOR_V1 !== 'true') {
          return reply.status(403).send({
            error: {
              code: 'FEATURE_NOT_ENABLED',
              message: 'Agent orchestrator is not enabled',
            },
          });
        }

        const userId = req.params.userId;

        if (!userId) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_USER_ID',
              message: 'userId is required',
            },
          });
        }

        const { memory } = orchestrator as any;
        const stats = await memory.getConversationStats(userId);

        return reply.send({
          userId,
          stats,
        });
      } catch (error: any) {
        console.error('[Agent API] Error in /stats/:userId:', error);
        return reply.status(500).send({
          error: {
            code: 'STATS_ERROR',
            message: error.message || 'Failed to retrieve stats',
          },
        });
      }
    }
  );

  /**
   * GET /api/agent/health
   * Health check for agent service
   */
  app.get('/api/agent/health', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const isEnabled = process.env.FF_AGENT_ORCHESTRATOR_V1 === 'true';
      const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

      return reply.send({
        status: isEnabled && hasOpenAIKey ? 'healthy' : 'disabled',
        enabled: isEnabled,
        configured: hasOpenAIKey,
        model: process.env.AGENT_LLM_MODEL || 'gpt-4o',
        maxIterations: parseInt(process.env.AGENT_MAX_ITERATIONS || '5', 10),
      });
    } catch (error: any) {
      return reply.status(500).send({
        status: 'unhealthy',
        error: error.message,
      });
    }
  });
}

