/**
 * Adaptive Difficulty Routes
 * Epic 9: True Adaptive Difficulty Engine
 * 
 * BRD: L-2 (Adaptive lesson plans with dynamic difficulty adjustment)
 * FSD: §30 (True Adaptive Difficulty Engine)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAnyRole, getSession } from '../middleware/rbac';
import { isValidUUID } from '../utils/validation';
import {
  calculateMasteryLevel,
  recommendDifficultyLevel,
  detectLearningStyle,
  identifyWeakTopics,
  updateLearnerProfile,
  recordAttemptForAdaptive,
  DifficultyLevel,
} from '../services/adaptive';
import { db } from '../db';
import { learnerProfiles, topicComprehension } from '../db/schema';
import { eq } from 'drizzle-orm';

const FF_ADAPTIVE_DIFFICULTY_V1 = process.env.FF_ADAPTIVE_DIFFICULTY_V1 === 'true';

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

export async function registerAdaptiveRoutes(app: FastifyInstance) {
  // Epic 9: Debug logging for route registration
  app.log.info(`[Epic9] Registering adaptive routes (FF_ADAPTIVE_DIFFICULTY_V1=${FF_ADAPTIVE_DIFFICULTY_V1})`);
  /**
   * GET /api/adaptive/profile/:userId
   * Get learner profile with learning style and weak topics
   * RBAC: admin, manager (any team), learner (self only)
   */
  app.get(
    '/api/adaptive/profile/:userId',
    async (
      req: FastifyRequest<{ Params: { userId: string } }>,
      reply: FastifyReply
    ) => {
      if (!FF_ADAPTIVE_DIFFICULTY_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Adaptive difficulty feature not enabled' },
        });
      }

      const { userId } = req.params;

      if (!isValidUUID(userId)) {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: 'Invalid user ID format' },
        });
      }

      if (!requireAnyRole(req, reply)) return reply;

      const session = getSessionOrMock(req);
      if (!session) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
      }

      // Check access: admin/manager can view anyone, learners can only view self
      if (session.role === 'learner' && session.userId !== userId) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Cannot access another learner\'s profile' },
        });
      }

      try {
        // Get or create learner profile
        let profile = await db
          .select()
          .from(learnerProfiles)
          .where(eq(learnerProfiles.userId, userId))
          .limit(1);

        if (profile.length === 0) {
          // Create default profile
          await updateLearnerProfile(userId);
          profile = await db
            .select()
            .from(learnerProfiles)
            .where(eq(learnerProfiles.userId, userId))
            .limit(1);
        }

        // Detect learning style if not set or confidence low
        const learningStyleDetection = await detectLearningStyle(userId);

        // Identify weak topics
        const weakTopics = await identifyWeakTopics(userId, 0.70);

        return reply.send({
          profile: {
            userId: profile[0]?.userId ?? userId,
            learningStyle: profile[0]?.learningStyle ?? learningStyleDetection.style,
            learningStyleConfidence: learningStyleDetection.confidence,
            avgResponseTime: profile[0]?.avgResponseTime ? Number(profile[0].avgResponseTime) : null,
            consistencyScore: profile[0]?.consistencyScore ? Number(profile[0].consistencyScore) : null,
          },
          weakTopics,
          learningStyleSignals: learningStyleDetection.signals,
        });
      } catch (error: any) {
        console.error('Error fetching adaptive profile:', error);
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch adaptive profile' },
        });
      }
    }
  );

  /**
   * GET /api/adaptive/topics/:topicId/difficulty/:userId
   * Get recommended difficulty level for next question
   * RBAC: admin, manager, learner (self only)
   */
  app.get(
    '/api/adaptive/topics/:topicId/difficulty/:userId',
    async (
      req: FastifyRequest<{ Params: { topicId: string; userId: string } }>,
      reply: FastifyReply
    ) => {
      if (!FF_ADAPTIVE_DIFFICULTY_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Adaptive difficulty feature not enabled' },
        });
      }

      const { topicId, userId } = req.params;

      if (!isValidUUID(topicId) || !isValidUUID(userId)) {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: 'Invalid UUID format' },
        });
      }

      if (!requireAnyRole(req, reply)) return reply;

      const session = getSessionOrMock(req);
      if (!session) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
      }

      // Check access: learners can only view self
      if (session.role === 'learner' && session.userId !== userId) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Cannot access another learner\'s difficulty' },
        });
      }

      try {
        const recommendation = await recommendDifficultyLevel(userId, topicId);

        return reply.send({
          difficulty: recommendation.difficulty,
          masteryLevel: recommendation.masteryLevel,
          confidence: recommendation.confidence,
          reasoning: recommendation.reasoning,
        });
      } catch (error: any) {
        console.error('Error recommending difficulty:', error);
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to recommend difficulty level' },
        });
      }
    }
  );

  /**
   * POST /api/adaptive/attempt
   * Record attempt and update adaptive difficulty data
   * RBAC: learner (self only)
   */
  app.post(
    '/api/adaptive/attempt',
    async (
      req: FastifyRequest<{
        Body: {
          userId: string;
          topicId: string;
          questionId: string;
          correct: boolean;
          partialCredit?: number;
          responseTimeMs?: number;
          difficultyLevel: DifficultyLevel;
        };
      }>,
      reply: FastifyReply
    ) => {
      if (!FF_ADAPTIVE_DIFFICULTY_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Adaptive difficulty feature not enabled' },
        });
      }

      if (!requireAnyRole(req, reply)) return reply;

      const session = getSessionOrMock(req);
      if (!session) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
      }

      const { userId, topicId, questionId, correct, partialCredit, responseTimeMs, difficultyLevel } = req.body;

      // Validate required fields
      if (!userId || !topicId || !questionId || typeof correct !== 'boolean' || !difficultyLevel) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: 'Missing required fields: userId, topicId, questionId, correct, difficultyLevel',
          },
        });
      }

      // Validate UUIDs
      if (!isValidUUID(userId) || !isValidUUID(topicId) || !isValidUUID(questionId)) {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: 'Invalid UUID format' },
        });
      }

      // Learners can only record their own attempts
      if (session.userId !== userId) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Cannot record attempt for another learner' },
        });
      }

      // Validate difficulty level
      const validDifficulties: DifficultyLevel[] = ['recall', 'application', 'analysis', 'synthesis'];
      if (!validDifficulties.includes(difficultyLevel)) {
        return reply.status(400).send({
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid difficulty level. Must be: recall, application, analysis, or synthesis',
          },
        });
      }

      // Validate partial credit (0.00 - 1.00)
      if (partialCredit !== undefined && (partialCredit < 0 || partialCredit > 1)) {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: 'Partial credit must be between 0.00 and 1.00' },
        });
      }

      try {
        const newMastery = await recordAttemptForAdaptive(userId, topicId, {
          questionId,
          correct,
          partialCredit,
          responseTimeMs,
          difficultyLevel,
        });

        return reply.send({
          success: true,
          newMastery,
        });
      } catch (error: any) {
        console.error('Error recording adaptive attempt:', error);
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to record adaptive attempt' },
        });
      }
    }
  );

  /**
   * GET /api/adaptive/analytics/:userId
   * Get adaptive learning analytics dashboard data
   * RBAC: admin, manager (any team), learner (self only)
   */
  app.get(
    '/api/adaptive/analytics/:userId',
    async (
      req: FastifyRequest<{ Params: { userId: string } }>,
      reply: FastifyReply
    ) => {
      if (!FF_ADAPTIVE_DIFFICULTY_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Adaptive difficulty feature not enabled' },
        });
      }

      const { userId } = req.params;

      if (!isValidUUID(userId)) {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: 'Invalid user ID format' },
        });
      }

      if (!requireAnyRole(req, reply)) return reply;

      const session = getSessionOrMock(req);
      if (!session) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
      }

      // Check access: learners can only view self
      if (session.role === 'learner' && session.userId !== userId) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Cannot access another learner\'s analytics' },
        });
      }

      try {
        // Get all topic comprehension for this user
        const allComprehension = await db
          .select()
          .from(topicComprehension)
          .where(eq(topicComprehension.userId, userId));

        // Calculate overall mastery (average of all topics)
        const overallMastery =
          allComprehension.length > 0
            ? allComprehension.reduce((sum: number, tc: any) => sum + Number(tc.masteryLevel), 0) /
              allComprehension.length
            : 0;

        // Identify strength topics (mastery >= 0.80)
        const strengthTopics = allComprehension
          .filter((tc: any) => Number(tc.masteryLevel) >= 0.80)
          .map((tc: any) => ({
            topicId: tc.topicId,
            mastery: Number(tc.masteryLevel),
            attemptsCount: tc.attemptsCount,
          }))
          .sort((a: any, b: any) => b.mastery - a.mastery)
          .slice(0, 5);

        // Identify weak topics (mastery < 0.70)
        const weakTopics = await identifyWeakTopics(userId, 0.70);

        // Get learning style
        const learningStyleDetection = await detectLearningStyle(userId);

        // Topic breakdown
        const topicBreakdown = allComprehension.map((tc: any) => ({
          topicId: tc.topicId,
          masteryLevel: Number(tc.masteryLevel),
          difficultyLevel: tc.difficultyLevel,
          attemptsCount: tc.attemptsCount,
          correctCount: tc.correctCount,
          confusionCount: tc.confusionCount,
          lastPracticedAt: tc.lastPracticedAt,
        }));

        return reply.send({
          overallMastery,
          learningStyle: learningStyleDetection.style,
          learningStyleConfidence: learningStyleDetection.confidence,
          topicBreakdown,
          strengthTopics,
          weakTopics: weakTopics.slice(0, 5), // Top 5 weak topics
          totalTopicsPracticed: allComprehension.length,
        });
      } catch (error: any) {
        console.error('Error fetching adaptive analytics:', error);
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch adaptive analytics' },
        });
      }
    }
  );
}

