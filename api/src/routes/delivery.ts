/**
 * Delivery Routes
 * Epic 5: Slack Channel Integration
 * BRD: B-7, AU-1, L-17 | FSD: §25 Slack Channel Integration v1
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { userChannels, channels, users } from '../db/schema';
import { requireManager, requireAdmin, requireAnyRole, getSession } from '../middleware/rbac';
import {
  deliverLesson,
  getUserPreferredChannel,
  recordSlackAttempt,
} from '../services/delivery';
import {
  verifySlackSignature,
  parseSlackButtonClick,
  sendSlackFeedback,
} from '../adapters/slack';

// Feature flags
const FF_CHANNEL_SLACK = process.env.FF_CHANNEL_SLACK === 'true';

export async function registerDeliveryRoutes(app: FastifyInstance) {
  /**
   * POST /api/delivery/send
   * Send a lesson to user via their preferred channel
   * RBAC: admin or manager only
   * Feature Flag: FF_CHANNEL_SLACK
   */
  app.post(
    '/api/delivery/send',
    async (
      req: FastifyRequest<{
        Body: { userId: string; channel: string; lessonId: string; questionId?: string };
      }>,
      reply: FastifyReply
    ) => {
      // Check feature flag
      if (!FF_CHANNEL_SLACK) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' },
        });
      }

      // Check RBAC
      if (!requireManager(req, reply)) return reply;

      const { userId, channel, lessonId, questionId } = req.body;

      // Validate input
      if (!userId || !lessonId) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required fields',
            details: { required: ['userId', 'lessonId'] },
          },
        });
      }

      try {
        const result = await deliverLesson(userId, lessonId, questionId);
        return reply.send(result);
      } catch (error: any) {
        if (error.message === 'USER_CHANNEL_NOT_CONFIGURED') {
          return reply.status(404).send({
            error: {
              code: 'CHANNEL_NOT_CONFIGURED',
              message: 'User has not configured delivery channel',
            },
          });
        }
        if (error.message === 'CHANNEL_PAUSED') {
          return reply.status(400).send({
            error: { code: 'CHANNEL_PAUSED', message: 'User has paused notifications' },
          });
        }
        if (error.message === 'WITHIN_QUIET_HOURS') {
          return reply.status(400).send({
            error: { code: 'WITHIN_QUIET_HOURS', message: 'Within user quiet hours' },
          });
        }
        return reply.status(503).send({
          error: { code: 'DELIVERY_FAILED', message: error.message },
        });
      }
    }
  );

  /**
   * POST /api/delivery/webhook/slack
   * Receive Slack events and interactivity (button clicks)
   * RBAC: Public (signature verified)
   * Feature Flag: FF_CHANNEL_SLACK
   */
  app.post(
    '/api/delivery/webhook/slack',
    async (req: FastifyRequest, reply: FastifyReply) => {
      // Check feature flag
      if (!FF_CHANNEL_SLACK) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' },
        });
      }

      // Get headers
      const signature = req.headers['x-slack-signature'] as string;
      const timestamp = req.headers['x-slack-request-timestamp'] as string;
      
      // Parse payload - Slack sends button clicks as form-encoded with 'payload' field
      let payload: any;
      let rawBody: string;
      
      const contentType = req.headers['content-type'] || '';
      
      if (contentType.includes('application/x-www-form-urlencoded')) {
        // Button clicks come as form-encoded
        // Use the raw body saved by the content type parser
        rawBody = (req as any).rawBody || '';
        const body = req.body as any;
        payload = typeof body.payload === 'string' ? JSON.parse(body.payload) : body;
      } else {
        // URL verification comes as JSON
        rawBody = JSON.stringify(req.body);
        payload = req.body as any;
      }

      // Validate required headers are present
      if (!signature || !timestamp) {
        return reply.status(400).send({
          error: {
            code: 'MISSING_HEADERS',
            message: 'Missing required Slack headers',
            details: { required: ['x-slack-signature', 'x-slack-request-timestamp'] },
          },
        });
      }

      // Get signing secret from first organization (MVP simplification)
      const [orgChannel] = await db
        .select()
        .from(channels)
        .where(eq(channels.type, 'slack'))
        .limit(1);

      if (!orgChannel) {
        return reply.status(404).send({
          error: { code: 'CHANNEL_NOT_CONFIGURED', message: 'Slack not configured' },
        });
      }

      const config = orgChannel.config as any;
      const signingSecret = config.slack_signing_secret;

      // Verify signature
      if (!verifySlackSignature(rawBody, timestamp, signature, signingSecret)) {
        return reply.status(401).send({
          error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature invalid' },
        });
      }

      // Handle URL verification (Slack setup)
      if (payload.type === 'url_verification') {
        return reply.send({ challenge: payload.challenge });
      }

      // Handle button click
      if (payload.type === 'block_actions') {
        const { slackUserId, questionId, answerValue, responseUrl } = parseSlackButtonClick(payload);

        // Find user by Slack ID
        const [userChannel] = await db
          .select({ userId: userChannels.userId })
          .from(userChannels)
          .where(
            and(
              eq(userChannels.channelType, 'slack'),
              eq(userChannels.channelId, slackUserId)
            )
          )
          .limit(1);

        if (!userChannel) {
          return reply.send({ text: '❌ User not found. Please link your Cerply account.' });
        }

        // Mock: Check if answer correct (in real implementation, fetch from DB)
        const correct = answerValue === 'option_a'; // A is always correct for MVP
        const explanation = correct
          ? 'Raising the alarm alerts others and ensures coordinated response.'
          : 'The correct answer is A. Raising the alarm should always be the first step.';

        // Record attempt
        await recordSlackAttempt(userChannel.userId, questionId, answerValue, correct);

        // Send feedback to Slack
        await sendSlackFeedback(responseUrl, correct, explanation);

        return reply.send({ ok: true });
      }

      return reply.send({ ok: true });
    }
  );

  /**
   * GET /api/delivery/channels
   * Get learner's configured channels
   * RBAC: learner (own channels) or admin
   * Feature Flag: FF_CHANNEL_SLACK
   */
  app.get('/api/delivery/channels', async (req: FastifyRequest, reply: FastifyReply) => {
    // Check feature flag
    if (!FF_CHANNEL_SLACK) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Feature not enabled' },
      });
    }

    // Check RBAC (any authenticated user can view their own channels)
    if (!requireAnyRole(req, reply)) return reply;

    const session = getSession(req);
    if (!session) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
    }

    const channels = await db
      .select()
      .from(userChannels)
      .where(eq(userChannels.userId, session.userId));

    return reply.send({ channels });
  });

  /**
   * POST /api/delivery/channels
   * Configure or update channel preferences
   * RBAC: learner (own channels) or admin
   * Feature Flag: FF_CHANNEL_SLACK
   */
  app.post(
    '/api/delivery/channels',
    async (
      req: FastifyRequest<{
        Body: {
          channelType: string;
          channelId?: string;
          preferences?: { quietHours?: string; timezone?: string; paused?: boolean };
        };
      }>,
      reply: FastifyReply
    ) => {
      // Check feature flag
      if (!FF_CHANNEL_SLACK) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' },
        });
      }

      // Check RBAC (any authenticated user can configure their own channels)
      if (!requireAnyRole(req, reply)) return reply;

      const session = getSession(req);
      if (!session) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const { channelType, channelId, preferences } = req.body;

      // Validate channelType
      if (!['slack', 'whatsapp', 'teams', 'email'].includes(channelType)) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid channel type',
            details: { allowed: ['slack', 'whatsapp', 'teams', 'email'] },
          },
        });
      }

      // Upsert user channel
      const [channel] = await db
        .insert(userChannels)
        .values({
          userId: session.userId,
          channelType,
          channelId: channelId || 'unknown', // Auto-discover in future
          preferences: preferences || {},
          verified: !!channelId, // Only verified if channelId provided
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [userChannels.userId, userChannels.channelType],
          set: {
            preferences: preferences || {},
            channelId: channelId || 'unknown',
          },
        })
        .returning();

      return reply.send({ channel });
    }
  );
}

