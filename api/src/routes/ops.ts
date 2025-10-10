/**
 * Operations & KPI Routes
 * Epic 3: Team Management & Learner Assignment
 * FSD §22A: OKR Alignment (events + /api/ops/kpis)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sql } from 'drizzle-orm';
import { db } from '../db';
import { teams, teamMembers, teamTrackSubscriptions } from '../db/schema';
import { requireManager, getSession } from '../middleware/rbac';
import { getAuditCounters } from '../services/audit';

export async function registerOpsRoutes(app: FastifyInstance) {
  /**
   * GET /api/ops/kpis
   * Get operational KPIs for OKR tracking
   * Includes O3 counters: teams_total, members_total, active_subscriptions
   * RBAC: admin or manager (prevents leaking cross-org data)
   */
  app.get('/api/ops/kpis', async (req: FastifyRequest, reply: FastifyReply) => {
    // Check RBAC - prevent unauthenticated access to org-wide KPIs
    if (!requireManager(req, reply)) return reply;

    try {
      // O3: Team Management KPIs
      const [teamsResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(teams);
      const teamsTotal = Number(teamsResult?.count || 0);

      const [membersResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(teamMembers);
      const membersTotal = Number(membersResult?.count || 0);

      const [subscriptionsResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(teamTrackSubscriptions)
        .where(sql`active = true`);
      const activeSubscriptions = Number(subscriptionsResult?.count || 0);

      // Epic 7: Gamification KPIs
      const gamificationCounters = getAuditCounters();

      return reply.status(200).send({
        o3: {
          teams_total: teamsTotal,
          members_total: membersTotal,
          active_subscriptions: activeSubscriptions,
        },
        epic7: {
          badges_awarded: gamificationCounters.badges_awarded,
          levels_changed: gamificationCounters.levels_changed,
          certificates_issued: gamificationCounters.certificates_issued,
          certificates_downloaded: gamificationCounters.certificates_downloaded,
          certificates_revoked: gamificationCounters.certificates_revoked,
          notifications_marked_read: gamificationCounters.notifications_marked_read,
        },
        generated_at: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[api/ops/kpis] Error:', error);
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get KPIs' },
      });
    }
  });
}

