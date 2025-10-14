/**
 * Conversation Routes
 * Natural, adaptive conversations for learning
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireManager } from '../middleware/rbac';
import { generateConversationalResponse } from '../services/conversation-engine';
import { playbackUnderstanding } from '../services/llm-orchestrator';

interface ConversationRequest {
  userInput: string;
  messageHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  currentState?: 'initial' | 'confirming' | 'refining' | 'generating';
  granularity?: 'subject' | 'topic' | 'module';
  understanding?: string;
  originalRequest?: string;
}

export async function registerConversationRoutes(app: FastifyInstance) {
  /**
   * POST /api/conversation
   * Natural conversational interface for learning
   */
  app.post(
    '/api/conversation',
    async (
      req: FastifyRequest<{ Body: ConversationRequest }>,
      reply: FastifyReply
    ) => {
      if (!requireManager(req, reply)) return reply;

      const {
        userInput,
        messageHistory = [],
        currentState = 'initial',
        granularity,
        understanding,
        originalRequest,
      } = req.body;

      if (!userInput || userInput.trim().length === 0) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_REQUEST',
            message: 'userInput is required',
          },
        });
      }

      try {
        // If this is the first message, get understanding from LLM
        let updatedUnderstanding = understanding;
        let updatedGranularity = granularity;
        let generationId = undefined;

        if (currentState === 'initial' && !understanding) {
          // Call understanding endpoint to detect granularity
          const understandingResult = await playbackUnderstanding(userInput);
          updatedUnderstanding = understandingResult.content;
          updatedGranularity = understandingResult.granularity as 'subject' | 'topic' | 'module';
          generationId = understandingResult.tokens; // Use as temp ID
        }

        // Generate conversational response
        const response = await generateConversationalResponse(userInput, {
          messageHistory,
          currentState: updatedUnderstanding ? 'confirming' : 'initial',
          granularity: updatedGranularity,
          understanding: updatedUnderstanding,
          originalRequest: originalRequest || userInput,
        });

        return reply.send({
          message: response.content,
          nextState: response.nextState,
          action: response.action,
          granularity: updatedGranularity,
          understanding: updatedUnderstanding,
          generationId,
        });
      } catch (error: any) {
        console.error('[Conversation] Error:', error);
        return reply.status(503).send({
          error: {
            code: 'LLM_UNAVAILABLE',
            message: error.message || 'Unable to process conversation',
          },
        });
      }
    }
  );
}

