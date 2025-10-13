/**
 * Chat Learning Routes
 * Epic 8: Conversational Learning Interface
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import { chatSessions, chatMessages } from '../db/schema';
import { requireAnyRole, getSession } from '../middleware/rbac';
import { classifyIntent, getHelpText } from '../services/intent-router';
import { generateExplanation, markExplanationHelpful } from '../services/explanation-engine';
import { getAllLearnerLevels } from '../services/gamification';
import { getUserCertificates } from '../services/certificates';
import { getLearnerBadges } from '../services/badges';

const FF_CONVERSATIONAL_UI_V1 = process.env.FF_CONVERSATIONAL_UI_V1 === 'true';

/**
 * Get session or mock session for admin token (dev/test only)
 */
function getSessionOrMock(req: FastifyRequest) {
  let session = getSession(req);
  
  // In dev/test: if admin token used but no session, create a mock session
  if (!session && process.env.NODE_ENV !== 'production') {
    const adminToken = process.env.ADMIN_TOKEN?.trim();
    const xAdminToken = req.headers['x-admin-token'] as string | undefined;
    const authHeader = req.headers.authorization as string | undefined;
    
    if (adminToken && (xAdminToken === adminToken || authHeader === `Bearer ${adminToken}`)) {
      // Use a test user ID for admin token requests
      session = { 
        userId: '00000000-0000-0000-0000-000000000001', 
        email: 'admin@test.local',
        role: 'admin' as const,
        organizationId: '00000000-0000-0000-0000-000000000001'
      };
    }
  }
  
  return session;
}

export async function registerChatLearningRoutes(app: FastifyInstance) {
  /**
   * POST /api/chat/message
   * Send a chat message and get response
   */
  app.post(
    '/api/chat/message',
    async (req: FastifyRequest<{ Body: { message: string; sessionId?: string } }>, reply: FastifyReply) => {
      if (!FF_CONVERSATIONAL_UI_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireAnyRole(req, reply)) return reply;

      const session = getSessionOrMock(req);
      if (!session) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
      }

      const { message, sessionId } = req.body;

      if (!message || message.trim().length === 0) {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: 'Message cannot be empty' }
        });
      }

      try {
        // Get or create session
        let activeSessionId = sessionId;
        
        if (!activeSessionId) {
          const [newSession] = await db.insert(chatSessions).values({
            userId: session.userId,
          }).returning();
          activeSessionId = newSession.id;
        }

        // Classify intent
        const { intent, confidence, extractedEntities } = classifyIntent(message);

        // Store user message
        await db.insert(chatMessages).values({
          sessionId: activeSessionId,
          role: 'user',
          content: message,
          intent,
          metadata: extractedEntities ? extractedEntities as any : null,
        });

        // Route to appropriate handler
        let response = '';
        const suggestions: string[] = [];

        switch (intent) {
          case 'progress':
            response = await handleProgressQuery(session.userId);
            suggestions.push("What's my next question?", "Show my badges", "Help");
            break;

          case 'next':
            response = "Let me fetch your next question...";
            suggestions.push("I don't understand", "Skip this", "Help");
            break;

          case 'explanation':
            response = "To provide a detailed explanation, please specify which question you need help with. You can also use the 'Request Explanation' button on any question.";
            suggestions.push("Help", "What's next?");
            break;

          case 'filter':
            const topicName = extractedEntities?.topicName || 'unknown';
            response = `I'll filter to show only ${topicName} questions. (This feature is coming soon!)`;
            suggestions.push("What's next?", "Show my progress");
            break;

          case 'help':
            response = getHelpText();
            suggestions.push("How am I doing?", "What's next?");
            break;

          default:
            response = "I'm not sure I understand. Try asking 'How am I doing?' or 'What's next?'. Type 'help' to see what I can do!";
            suggestions.push("Help", "How am I doing?");
        }

        // Store assistant response
        await db.insert(chatMessages).values({
          sessionId: activeSessionId,
          role: 'assistant',
          content: response,
          intent,
        });

        return reply.send({
          sessionId: activeSessionId,
          response,
          intent,
          confidence,
          suggestions,
        });
      } catch (error: any) {
        console.error('[chat-learning] Error processing message:', error);
        return reply.status(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to process message'
          }
        });
      }
    }
  );

  /**
   * GET /api/chat/sessions
   * List recent chat sessions for the learner
   */
  app.get(
    '/api/chat/sessions',
    async (req: FastifyRequest<{ Querystring: { limit?: number; offset?: number } }>, reply: FastifyReply) => {
      if (!FF_CONVERSATIONAL_UI_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireAnyRole(req, reply)) return reply;

      const session = getSessionOrMock(req);
      if (!session) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
      }

      const limit = Math.min(req.query.limit || 10, 50);
      const offset = req.query.offset || 0;

      try {
        const sessions = await db.select()
          .from(chatSessions)
          .where(eq(chatSessions.userId, session.userId))
          .orderBy(desc(chatSessions.startedAt))
          .limit(limit)
          .offset(offset);

        // Get message count and last message for each session
        const sessionsWithMeta = await Promise.all(
          sessions.map(async (s) => {
            const messages = await db.select()
              .from(chatMessages)
              .where(eq(chatMessages.sessionId, s.id))
              .orderBy(desc(chatMessages.createdAt))
              .limit(1);

            const messageCountResult = await db.select({ count: sql<number>`count(*)` })
              .from(chatMessages)
              .where(eq(chatMessages.sessionId, s.id));

            return {
              id: s.id,
              startedAt: s.startedAt,
              endedAt: s.endedAt,
              messageCount: messageCountResult[0]?.count || 0,
              lastMessage: messages[0]?.content || '',
            };
          })
        );

        return reply.send({
          sessions: sessionsWithMeta,
          total: sessions.length,
          limit,
          offset,
        });
      } catch (error: any) {
        console.error('[chat-learning] Error fetching sessions:', error);
        return reply.status(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch sessions'
          }
        });
      }
    }
  );

  /**
   * GET /api/chat/sessions/:id
   * Get full message history for a session
   */
  app.get(
    '/api/chat/sessions/:id',
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      if (!FF_CONVERSATIONAL_UI_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireAnyRole(req, reply)) return reply;

      const session = getSessionOrMock(req);
      if (!session) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
      }

      const { id } = req.params;

      try {
        // Verify session ownership
        const [chatSession] = await db.select()
          .from(chatSessions)
          .where(and(
            eq(chatSessions.id, id),
            eq(chatSessions.userId, session.userId)
          ))
          .limit(1);

        if (!chatSession) {
          return reply.status(404).send({
            error: { code: 'NOT_FOUND', message: 'Session not found' }
          });
        }

        // Get all messages
        const messages = await db.select()
          .from(chatMessages)
          .where(eq(chatMessages.sessionId, id))
          .orderBy(chatMessages.createdAt);

        return reply.send({
          session: {
            id: chatSession.id,
            startedAt: chatSession.startedAt,
            endedAt: chatSession.endedAt,
          },
          messages: messages.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            intent: m.intent,
            createdAt: m.createdAt,
          })),
        });
      } catch (error: any) {
        console.error('[chat-learning] Error fetching session history:', error);
        return reply.status(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch session history'
          }
        });
      }
    }
  );

  /**
   * POST /api/chat/explanation
   * Request deeper explanation for question
   */
  app.post(
    '/api/chat/explanation',
    async (req: FastifyRequest<{ Body: { questionId: string; query: string; sessionId?: string } }>, reply: FastifyReply) => {
      if (!FF_CONVERSATIONAL_UI_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireAnyRole(req, reply)) return reply;

      const session = getSessionOrMock(req);
      if (!session) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
      }

      const { questionId, query, sessionId } = req.body;

      if (!questionId || !query) {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: 'questionId and query required' }
        });
      }

      try {
        const result = await generateExplanation(questionId, query, session.userId);

        return reply.send({
          explanation: result.explanation,
          model: result.model,
          tokensUsed: result.tokensUsed,
          cost: result.cost,
          cached: result.cached,
          confusionLogId: result.confusionLogId,
        });
      } catch (error: any) {
        console.error('[chat-learning] Explanation generation error:', error);
        return reply.status(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: error.message || 'Failed to generate explanation'
          }
        });
      }
    }
  );

  /**
   * POST /api/chat/feedback
   * Mark explanation as helpful or not
   */
  app.post(
    '/api/chat/feedback',
    async (req: FastifyRequest<{ Body: { confusionLogId: string; helpful: boolean } }>, reply: FastifyReply) => {
      if (!FF_CONVERSATIONAL_UI_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireAnyRole(req, reply)) return reply;

      const session = getSessionOrMock(req);
      if (!session) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
      }

      const { confusionLogId, helpful } = req.body;

      if (!confusionLogId || typeof helpful !== 'boolean') {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: 'confusionLogId and helpful (boolean) required' }
        });
      }

      try {
        await markExplanationHelpful(confusionLogId, helpful);

        return reply.send({
          ok: true,
          message: 'Thanks for your feedback!'
        });
      } catch (error: any) {
        return reply.status(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: error.message || 'Failed to save feedback'
          }
        });
      }
    }
  );
}

/**
 * Handle progress query - get learner stats
 */
async function handleProgressQuery(userId: string): Promise<string> {
  try {
    // Get learner levels across all tracks
    const levels = await getAllLearnerLevels(userId);
    const certificates = await getUserCertificates(userId);
    const badges = await getLearnerBadges(userId);

    if (levels.length === 0) {
      return "You haven't started any tracks yet. Let's get started! What would you like to learn?";
    }

    const levelSummary = levels.map(l => `${l.trackTitle}: ${l.level} (${l.correctAttempts} correct)`).join('\n');

    return `Here's your progress:

**Levels:**
${levelSummary}

**Certificates:** ${certificates.length} earned
**Badges:** ${badges.length} unlocked

Keep up the great work! 🎉`;
  } catch (err) {
    console.error('[Chat] Progress query error:', err);
    return "I couldn't fetch your progress right now. Please try again in a moment.";
  }
}

