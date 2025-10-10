/**
 * Gamification Routes
 * Epic 7: Gamification & Certification System
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, count } from 'drizzle-orm';
import { db } from '../db';
import { managerNotifications, users, certificates } from '../db/schema';
import { requireAnyRole, requireManager, getSession } from '../middleware/rbac';
import { isValidUUID } from '../utils/validation';
import { checkIdempotencyKey, storeIdempotencyKey } from '../middleware/idempotency';
import { parsePaginationParams, createPaginatedResponse } from '../utils/pagination';
import { getLearnerLevel, getAllLearnerLevels } from '../services/gamification';
import { renderCertificatePDF, getUserCertificates, verifyCertificate, revokeCertificate } from '../services/certificates';
import { getLearnerBadges, getAllBadges } from '../services/badges';
import { getManagerNotifications, markNotificationRead, getUnreadCount } from '../services/notifications';
import { emitCertificateDownloaded, emitNotificationMarkedRead, emitCertificateRevoked } from '../services/audit';

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

      const { id, trackId } = req.params;

      // Validate UUIDs
      if (!isValidUUID(id) || !isValidUUID(trackId)) {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: 'Invalid UUID format' }
        });
      }

      if (!requireAnyRole(req, reply)) return reply;

      const session = getSession(req);

      // Check access (own data or manager/admin; skip if using admin token)
      const isAdminToken = !session;
      if (!isAdminToken && id !== session!.userId && session!.role !== 'manager' && session!.role !== 'admin') {
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
   * Get all learner levels across all tracks (paginated)
   */
  app.get(
    '/api/learners/:id/levels',
    async (req: FastifyRequest<{ Params: { id: string }; Querystring: { limit?: string; offset?: string } }>, reply: FastifyReply) => {
      if (!FF_GAMIFICATION_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      const { id } = req.params;

      // Validate UUID
      if (!isValidUUID(id)) {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: 'Invalid UUID format' }
        });
      }

      if (!requireAnyRole(req, reply)) return reply;

      const session = getSession(req);

      // Check access (skip if using admin token)
      const isAdminToken = !session; // Admin token bypass has no session
      if (!isAdminToken && id !== session!.userId && session!.role !== 'manager' && session!.role !== 'admin') {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Not authorized' }
        });
      }

      try {
        const params = parsePaginationParams(req.query);
        const { data, total } = await getAllLearnerLevels(id, params.limit, params.offset);
        const response = createPaginatedResponse(data, total, params);
        return reply.send({ levels: response.data, pagination: response.pagination });
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

      const { id } = req.params;

      // Validate UUID
      if (!isValidUUID(id)) {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: 'Invalid UUID format' }
        });
      }

      if (!requireAnyRole(req, reply)) return reply;

      const session = getSession(req);

      // Check access (skip if using admin token)
      const isAdminToken = !session;
      if (!isAdminToken && id !== session!.userId && session!.role !== 'manager' && session!.role !== 'admin') {
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

      const { id } = req.params;

      // Validate UUID
      if (!isValidUUID(id)) {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: 'Invalid UUID format' }
        });
      }

      if (!requireAnyRole(req, reply)) return reply;

      const session = getSession(req);

      // Check access (skip if using admin token)
      const isAdminToken = !session;
      if (!isAdminToken && id !== session!.userId && session!.role !== 'manager' && session!.role !== 'admin') {
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

      const { id } = req.params;

      // Validate UUID
      if (!isValidUUID(id)) {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: 'Invalid UUID format' }
        });
      }

      if (!requireAnyRole(req, reply)) return reply;

      try {
        const pdfBuffer = await renderCertificatePDF(id);

        // Emit audit event for certificate download
        const session = getSession(req);
        emitCertificateDownloaded({
          userId: session?.userId || 'unknown',
          certificateId: id,
          performedBy: session?.userId,
          requestId: req.id as string,
        });

        return reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `attachment; filename="certificate-${id}.pdf"`)
          .header('Cache-Control', 'private, max-age=3600') // Cache for 1 hour
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
   * GET /api/certificates/:id/verify
   * Verify certificate validity and check revocation status
   */
  app.get(
    '/api/certificates/:id/verify',
    async (req: FastifyRequest<{ Params: { id: string }; Querystring: { signature: string } }>, reply: FastifyReply) => {
      if (!FF_CERTIFICATES_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      const { id } = req.params;
      const { signature } = req.query;

      // Validate UUID
      if (!isValidUUID(id)) {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: 'Invalid UUID format' }
        });
      }

      if (!signature) {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: 'Signature query parameter required' }
        });
      }

      try {
        const result = await verifyCertificate(id, signature);
        return reply.send(result);
      } catch (error) {
        console.error('[gamification] Error verifying certificate:', error);
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to verify certificate' }
        });
      }
    }
  );

  /**
   * POST /api/certificates/:id/revoke
   * Revoke a certificate (admin-only, idempotent)
   * RBAC: admin only
   */
  app.post(
    '/api/certificates/:id/revoke',
    async (req: FastifyRequest<{ Params: { id: string }; Body: { reason: string } }>, reply: FastifyReply) => {
      if (!FF_CERTIFICATES_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      // Check idempotency key
      const replayed = await checkIdempotencyKey(req, reply, '/api/certificates/:id/revoke');
      if (replayed) {
        return; // Already sent response
      }

      // Admin-only (use requireRole with 'admin' or check session manually)
      const passed = requireAnyRole(req, reply);
      if (!passed) {
        return reply;
      }

      const session = getSession(req);
      if (session && session.role !== 'admin') {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Admin role required' }
        });
      }

      const { id } = req.params;
      const { reason } = req.body;

      // Validate UUID
      if (!isValidUUID(id)) {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: 'Invalid UUID format' }
        });
      }

      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: 'Revocation reason required' }
        });
      }

      try {
        const result = await revokeCertificate(id, reason.trim());

        // Emit audit event
        // Note: We need to fetch the certificate to get userId and orgId
        const [cert] = await db.select().from(certificates).where(eq(certificates.id, id)).limit(1);
        if (cert) {
          await emitCertificateRevoked({
            userId: cert.userId,
            organizationId: cert.organizationId || undefined,
            certificateId: id,
            reason: reason.trim(),
            performedBy: session?.userId,
            requestId: req.id,
          });
        }

        const responseBody = result;
        await storeIdempotencyKey(req, '/api/certificates/:id/revoke', 200, responseBody);

        return reply.send(responseBody);
      } catch (error) {
        console.error('[gamification] Error revoking certificate:', error);
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to revoke certificate' }
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
    async (req: FastifyRequest<{ Querystring: { unreadOnly?: string; limit?: string; offset?: string } }>, reply: FastifyReply) => {
      if (!FF_MANAGER_NOTIFICATIONS_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' }
        });
      }

      if (!requireManager(req, reply)) return reply;

      const session = getSession(req);
      const isAdminToken = !session;
      
      // For admin token bypass, return empty results (no associated manager)
      if (isAdminToken) {
        return reply.send({
          notifications: [],
          pagination: { total: 0, limit: 50, offset: 0, hasMore: false },
          unreadCount: 0,
        });
      }

      try {
        const params = parsePaginationParams(req.query);
        const { unreadOnly } = req.query;
        
        const { data, total } = await getManagerNotifications(
          session.userId,
          unreadOnly === 'true',
          params.limit,
          params.offset
        );

        const unreadCount = await getUnreadCount(session.userId);
        const paginated = createPaginatedResponse(data, total, params);

        return reply.send({
          notifications: paginated.data,
          pagination: paginated.pagination,
          unreadCount,
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

      const { id } = req.params;

      // Validate UUID
      if (!isValidUUID(id)) {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: 'Invalid UUID format' }
        });
      }

      if (!requireManager(req, reply)) return reply;

      const session = getSession(req);
      const isAdminToken = !session;
      
      // Admin token bypass: can't mark notifications without a user context
      if (isAdminToken) {
        return reply.status(400).send({
          error: { code: 'BAD_REQUEST', message: 'Requires user session (admin token cannot modify notifications)' }
        });
      }

      // Check idempotency key
      const route = `/api/manager/notifications/:id`;
      const wasReplayed = await checkIdempotencyKey(req, reply, route);
      if (wasReplayed) {
        return reply;
      }

      const { read } = req.body;

      try {
        const success = await markNotificationRead(id, session.userId);

        if (!success) {
          return reply.status(404).send({
            error: { code: 'NOT_FOUND', message: 'Notification not found' }
          });
        }

        // Emit audit event
        emitNotificationMarkedRead({
          userId: session.userId,
          notificationId: id,
          notificationType: 'manager_notification',
          performedBy: session.userId,
          requestId: req.id as string,
        });

        const responseBody = { id, read };
        
        // Store idempotency key
        await storeIdempotencyKey(req, route, 200, responseBody);
        
        return reply.send(responseBody);
      } catch (error) {
        console.error('[gamification] Error marking notification as read:', error);
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to update notification' }
        });
      }
    }
  );
}

