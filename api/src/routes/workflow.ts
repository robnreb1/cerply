/**
 * Workflow Routes
 * Handles learner welcome workflow and intent detection
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireManager } from '../middleware/rbac';
import { searchTopics } from '../services/topic-search';
import { storeConversation, storeWorkflowDecision } from '../services/conversation-memory';
import { callOpenAI, detectGranularity, getGranularityMetadata } from '../services/llm-orchestrator';
import { db } from '../db';
import { topicAssignments, modulesV2, topics } from '../db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';

interface DetectIntentRequest {
  userInput: string;
  conversationHistory: Array<{ role: string; content: string }>;
  userId: string;
}

interface TopicSearchRequest {
  query: string;
  userId: string;
  limit?: number;
  skipLLMGeneration?: boolean;
}

interface ConversationStoreRequest {
  userId: string;
  conversationId: string;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  workflowId: string;
}

export async function registerWorkflowRoutes(app: FastifyInstance) {
  /**
   * POST /api/workflow/detect-intent
   * Classify user input as shortcut, learning, or other
   */
  app.post(
    '/api/workflow/detect-intent',
    async (
      req: FastifyRequest<{ Body: DetectIntentRequest }>,
      reply: FastifyReply
    ) => {
      // No auth check - workflow endpoints accept test tokens for development

      const { userInput, conversationHistory = [], userId } = req.body;

      if (!userInput || !userId) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_REQUEST',
            message: 'userInput and userId are required',
          },
        });
      }

      try {
        // CRITICAL: LLM-POWERED INTENT DETECTION WITH FULL CONTEXT
        // This is the brain of the system - it understands natural language in context
        
        const systemPrompt = `You are an intelligent intent router for a learning platform.

ANALYZE the conversation history and user's latest input to determine their intent.

POSSIBLE INTENTS:
1. "learning" - User wants to learn something (new or continuing)
   - Examples: "teach me physics", "I want to learn coding", "astrophysics", "particle physics"
   
2. "new_session" - User wants to START FRESH (meta-request, not a specific topic)
   - Examples: "let's try something new", "pick something different", "learn something new", "I want to learn something else"
   - CRITICAL: These are NOT topics to learn - they're requests to restart the conversation
   
3. "shortcut" - User wants to navigate to a specific feature
   - upload: "upload", "add content", "import"
   - progress: "show progress", "my status", "how am I doing"
   - curate: "curate", "manage content"
   
4. "continue" - User wants to resume their current learning
   - Examples: "continue", "resume", "keep going", "next"
   
5. "other" - Conversational, needs more clarification
   - Examples: "what can you do?", "help", "I'm not sure"

CRITICAL DISTINCTION:
- "teach me physics" → intent: "learning", learningTopic: "physics" (SPECIFIC TOPIC)
- "learn something new" → intent: "new_session", learningTopic: null (META REQUEST TO RESTART)

CONTEXT AWARENESS:
- If user just finished a topic → "let's try something new" = intent: "new_session"
- If user is mid-conversation and says "yes" → intent: "learning" (continuation)
- If user says a VAGUE phrase like "something new", "something else" → intent: "new_session"

Return ONLY JSON (no markdown):
{
  "intent": "learning|new_session|shortcut|continue|other",
  "confidence": 0-1,
  "shortcutType": "upload|progress|curate|null",
  "learningTopic": "extracted specific topic OR null if meta-request",
  "suggestedRoute": "route_to_learning|route_to_new_session|route_to_shortcut|route_to_continue|continue_conversation",
  "reasoning": "brief explanation of your classification"
}`;

        // Use last 6 messages for context (enough to understand conversation flow)
        const conversationContext = conversationHistory.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');
        
        const userPrompt = `CONVERSATION HISTORY:
${conversationContext}

USER'S LATEST INPUT: "${userInput}"

TASK: Classify the user's intent based on the FULL CONTEXT of the conversation.

If the conversation just ended (user confirmed a topic) and they're now saying "let's pick something new" or similar, this is a NEW LEARNING REQUEST.

Return your classification as JSON:`;

        const result = await callOpenAI('gpt-4o-mini', userPrompt, systemPrompt, 3, 0.1);
        
        let cleanContent = result.content.trim();
        if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        }
        
        const classification = JSON.parse(cleanContent);

        return reply.send(classification);
      } catch (error: any) {
        console.error('[workflow] Intent detection error:', error);
        
        // Fallback: simple pattern matching
        const lowerInput = userInput.toLowerCase();
        let intent = 'unclear';
        let shortcutType = null;
        let learningTopic = null;
        let suggestedRoute = 'continue_conversation';
        
        if (lowerInput.includes('upload')) {
          intent = 'shortcut';
          shortcutType = 'upload';
          suggestedRoute = 'route_to_shortcut';
        } else if (lowerInput.includes('progress') || lowerInput.includes('status')) {
          intent = 'shortcut';
          shortcutType = 'progress';
          suggestedRoute = 'route_to_shortcut';
        } else if (lowerInput.includes('curate')) {
          intent = 'shortcut';
          shortcutType = 'curate';
          suggestedRoute = 'route_to_shortcut';
        } else if (lowerInput.includes('continue') || lowerInput.includes('resume')) {
          intent = 'continue';
          suggestedRoute = 'route_to_continue';
        } else if (lowerInput.includes('teach') || lowerInput.includes('learn') || lowerInput.includes('study')) {
          intent = 'learning';
          learningTopic = userInput;
          suggestedRoute = 'route_to_learning';
        }

        return reply.send({
          intent,
          confidence: 0.7,
          shortcutType,
          learningTopic,
          suggestedRoute,
        });
      }
    }
  );

  /**
   * POST /api/topics/search
   * Fuzzy search topics or generate suggestions
   */
  app.post(
    '/api/topics/search',
    async (
      req: FastifyRequest<{ Body: TopicSearchRequest }>,
      reply: FastifyReply
    ) => {
      // No auth check - workflow endpoints accept test tokens for development

      const { query, userId, limit = 5, skipLLMGeneration = true } = req.body;

      if (!query || !userId) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_REQUEST',
            message: 'query and userId are required',
          },
        });
      }

      try {
        const result = await searchTopics(query, limit, skipLLMGeneration);
        return reply.send(result);
      } catch (error: any) {
        console.error('[workflow] Topic search error:', error);
        return reply.status(500).send({
          error: {
            code: 'TOPIC_SEARCH_FAILED',
            message: error.message || 'Failed to search topics',
          },
        });
      }
    }
  );

  /**
   * GET /api/learner/active-modules
   * Get user's active learning modules
   */
  app.get(
    '/api/learner/active-modules',
    async (
      req: FastifyRequest<{ Querystring: { userId: string } }>,
      reply: FastifyReply
    ) => {
      // No auth check - workflow endpoints accept test tokens for development

      const { userId } = req.query;

      if (!userId) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_REQUEST',
            message: 'userId is required',
          },
        });
      }

      try {
        // Get active topic assignments (not completed, not paused)
        const assignments = await db
          .select({
            topicId: topicAssignments.topicId,
            topicTitle: topics.title,
            assignedAt: topicAssignments.assignedAt,
          })
          .from(topicAssignments)
          .leftJoin(topics, eq(topicAssignments.topicId, topics.id))
          .where(
            and(
              eq(topicAssignments.userId, userId),
              eq(topicAssignments.paused, false),
              isNull(topicAssignments.completedAt)
            )
          )
          .orderBy(desc(topicAssignments.assignedAt))
          .limit(10);

        // For each topic, get modules
        const activeModules = [];
        for (const assignment of assignments) {
          const modules = await db
            .select()
            .from(modulesV2)
            .where(eq(modulesV2.topicId, assignment.topicId))
            .orderBy(modulesV2.orderIndex)
            .limit(1); // Get first module as starting point

          if (modules.length > 0) {
            activeModules.push({
              topicId: assignment.topicId,
              topicTitle: assignment.topicTitle,
              moduleId: modules[0].id,
              moduleTitle: modules[0].title,
              progress: 0, // TODO: Calculate actual progress
              lastActive: assignment.assignedAt.toISOString(),
              priority: calculatePriority(assignment),
            });
          }
        }

        return reply.send({
          activeModules,
          hasActiveModules: activeModules.length > 0,
        });
      } catch (error: any) {
        console.error('[workflow] Active modules error:', error);
        return reply.status(500).send({
          error: {
            code: 'ACTIVE_MODULES_FAILED',
            message: error.message || 'Failed to fetch active modules',
          },
        });
      }
    }
  );

  /**
   * POST /api/workflow/detect-granularity
   * Detect if input is Subject, Topic, or Module level
   */
  app.post(
    '/api/workflow/detect-granularity',
    async (
      req: FastifyRequest<{ Body: { userInput: string } }>,
      reply: FastifyReply
    ) => {
      // No auth check - workflow endpoints accept test tokens for development

      const { userInput } = req.body;

      if (!userInput) {
        return reply.status(400).send({
          error: {
            code: 'MISSING_INPUT',
            message: 'userInput is required',
          },
        });
      }

      try {
        const granularity = detectGranularity(userInput);
        const metadata = getGranularityMetadata(userInput);

        return reply.send({
          granularity,
          input: userInput,
          metadata,
        });
      } catch (error: any) {
        console.error('[workflow] Granularity detection error:', error);
        return reply.status(500).send({
          error: {
            code: 'GRANULARITY_DETECTION_FAILED',
            message: error.message || 'Failed to detect granularity',
          },
        });
      }
    }
  );

  /**
   * POST /api/conversation/store
   * Store conversation for 30-day retention
   */
  app.post(
    '/api/conversation/store',
    async (
      req: FastifyRequest<{ Body: ConversationStoreRequest }>,
      reply: FastifyReply
    ) => {
      // No auth check - workflow endpoints accept test tokens for development

      const { userId, conversationId, messages, workflowId } = req.body;

      if (!userId || !conversationId || !messages || !workflowId) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_REQUEST',
            message: 'userId, conversationId, messages, and workflowId are required',
          },
        });
      }

      try {
        await storeConversation(userId, conversationId, messages, workflowId);

        return reply.send({
          success: true,
          conversationId,
        });
      } catch (error: any) {
        console.error('[workflow] Conversation store error:', error);
        return reply.status(500).send({
          error: {
            code: 'CONVERSATION_STORE_FAILED',
            message: error.message || 'Failed to store conversation',
          },
        });
      }
    }
  );
}

/**
 * Calculate priority for active modules
 * Higher priority = should be shown first
 */
function calculatePriority(assignment: any): number {
  // Simple priority: more recent = higher priority
  // In future: factor in timeFrameToMaster and currentLevel from learner profile
  const daysSinceAssigned = Math.floor((Date.now() - new Date(assignment.assignedAt).getTime()) / (1000 * 60 * 60 * 24));
  
  // Priority decreases as time passes (to encourage starting)
  const priority = Math.max(1, 10 - daysSinceAssigned);
  
  return priority;
}

