/**
 * Gamification Routes
 * Epic 7: Gamification & Certification System
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, count } from 'drizzle-orm';
import { db } from '../db';
import { managerNotifications, users } from '../db/schema';
import { requireAnyRole, requireManager, getSession } from '../middleware/rbac';
import { getLearnerLevel, getAllLearnerLevels } from '../services/gamification';
import { renderCertificatePDF, getUserCertificates } from '../services/certificates';
import { getLearnerBadges, getAllBadges } from '../services/badges';
import { getManagerNotifications, markNotificationRead, getUnreadCount } from '../services/notifications';

const FF_GAMIFICATION_V1 = process.env.FF_GAMIFICATION_V1 === 'true';
const FF_CERTIFICATES_V1 = process.env.FF_CERTIFICATES_V1 === 'true';
const FF_MANAGER_NOTIFICATIONS_V1 = process.env.FF_MANAGER_NOTIFICATIONS_V1 === 'true';

export async function registerGamificationRoutes(app: FastifyInstance) {
  /**
   * GET /api/learners/:id/level/:trackId
   * Get learner's current level for track
   */
  app.get(
    '/api/learners/:id/level/:trackId',
    async (req: FastifyRequest<{ Params: { id: string; trackId: string } }>, reply: FastifyReply) => {
      if (!FF_GAMIFICATION_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireAnyRole(req, reply)) return reply;

      const session = getSession(req);
      const { id, trackId } = req.params;

      // Check access (own data or manager/admin)
      if (id !== session!.userId && session!.role !== 'manager' && session!.role !== 'admin') {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Not authorized' }
        });
      }

      try {
        const levelInfo = await getLearnerLevel(id, trackId);

        return reply.send({
          userId: id,
          trackId,
          ...levelInfo,
        });
      } catch (error) {
        console.error('[gamification] Error getting learner level:', error);
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to get learner level' }
        });
      }
    }
  );

  /**
   * GET /api/learners/:id/levels
   * Get all learner levels across all tracks
   */
  app.get(
    '/api/learners/:id/levels',
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      if (!FF_GAMIFICATION_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireAnyRole(req, reply)) return reply;

      const session = getSession(req);
      const { id } = req.params;

      // Check access
      if (id !== session!.userId && session!.role !== 'manager' && session!.role !== 'admin') {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Not authorized' }
        });
      }

      try {
        const levels = await getAllLearnerLevels(id);
        return reply.send({ levels });
      } catch (error) {
        console.error('[gamification] Error getting all learner levels:', error);
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to get learner levels' }
        });
      }
    }
  );

  /**
   * GET /api/learners/:id/certificates
   * List all certificates earned by learner
   */
  app.get(
    '/api/learners/:id/certificates',
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      if (!FF_CERTIFICATES_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireAnyRole(req, reply)) return reply;

      const session = getSession(req);
      const { id } = req.params;

      // Check access
      if (id !== session!.userId && session!.role !== 'manager' && session!.role !== 'admin') {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Not authorized' }
        });
      }

      try {
        const certificates = await getUserCertificates(id);
        return reply.send({ certificates });
      } catch (error) {
        console.error('[gamification] Error getting certificates:', error);
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to get certificates' }
        });
      }
    }
  );

  /**
   * GET /api/learners/:id/badges
   * List all badges earned by learner
   */
  app.get(
    '/api/learners/:id/badges',
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      if (!FF_GAMIFICATION_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireAnyRole(req, reply)) return reply;

      const session = getSession(req);
      const { id } = req.params;

      // Check access
      if (id !== session!.userId && session!.role !== 'manager' && session!.role !== 'admin') {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Not authorized' }
        });
      }

      try {
        const earnedBadges = await getLearnerBadges(id);
        const allBadges = await getAllBadges();

        return reply.send({
          badges: earnedBadges,
          totalBadges: allBadges.length,
          earned: earnedBadges.length,
          remaining: allBadges.length - earnedBadges.length,
        });
      } catch (error) {
        console.error('[gamification] Error getting badges:', error);
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to get badges' }
        });
      }
    }
  );

  /**
   * GET /api/certificates/:id/download
   * Download certificate PDF
   */
  app.get(
    '/api/certificates/:id/download',
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      if (!FF_CERTIFICATES_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireAnyRole(req, reply)) return reply;

      const { id } = req.params;

      try {
        const pdfBuffer = await renderCertificatePDF(id);

        return reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `attachment; filename="certificate-${id}.pdf"`)
          .send(pdfBuffer);
      } catch (error) {
        console.error('[gamification] Error downloading certificate:', error);
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to generate certificate PDF' }
        });
      }
    }
  );

  /**
   * GET /api/manager/notifications
   * Get manager's notifications (unread + recent read)
   */
  app.get(
    '/api/manager/notifications',
    async (req: FastifyRequest<{ Querystring: { unreadOnly?: string; limit?: string } }>, reply: FastifyReply) => {
      if (!FF_MANAGER_NOTIFICATIONS_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireManager(req, reply)) return reply;

      const session = getSession(req);
      if (!session) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Session required' }
        });
      }

      const { unreadOnly, limit } = req.query;
      const maxResults = parseInt(limit || '50', 10);

      try {
        const notifications = await getManagerNotifications(
          session.userId,
          unreadOnly === 'true',
          maxResults
        );

        const unreadCount = await getUnreadCount(session.userId);

        return reply.send({
          notifications,
          unreadCount,
          total: notifications.length,
        });
      } catch (error) {
        console.error('[gamification] Error getting notifications:', error);
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to get notifications' }
        });
      }
    }
  );

  /**
   * PATCH /api/manager/notifications/:id
   * Mark notification as read
   */
  app.patch(
    '/api/manager/notifications/:id',
    async (req: FastifyRequest<{ Params: { id: string }; Body: { read: boolean } }>, reply: FastifyReply) => {
      if (!FF_MANAGER_NOTIFICATIONS_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireManager(req, reply)) return reply;

      const session = getSession(req);
      if (!session) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Session required' }
        });
      }

      const { id } = req.params;
      const { read } = req.body;

      try {
        const success = await markNotificationRead(id, session.userId);

        if (!success) {
          return reply.status(404).send({
            error: { code: 'NOT_FOUND', message: 'Notification not found' }
          });
        }

        return reply.send({ id, read });
      } catch (error) {
        console.error('[gamification] Error marking notification as read:', error);
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to update notification' }
        });
      }
    }
  );
}

