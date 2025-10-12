/**
 * Manager Analytics Routes
 * Epic 4: Manager Dashboard - Analytics & Insights
 * BRD: B-2, B-14 | FSD: §24 Manager Dashboard & Analytics v1
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { teams, organizations, teamMembers, users } from '../db/schema';
import { requireManager, requireAdmin, getSession } from '../middleware/rbac';
import {
  computeTeamAnalytics,
  getAtRiskLearners,
  computeRetentionCurve,
  getTrackPerformance,
  getOrganizationOverview,
  clearAnalyticsCache,
} from '../services/analytics';

// Feature flags
const FF_MANAGER_DASHBOARD_V1 = process.env.FF_MANAGER_DASHBOARD_V1 === 'true';
const FF_ANALYTICS_PILOT_V1 = process.env.FF_ANALYTICS_PILOT_V1 === 'true';

/**
 * Check if manager owns team or is admin
 */
async function verifyTeamOwnership(
  req: FastifyRequest,
  reply: FastifyReply,
  teamId: string
): Promise<boolean> {
  const session = getSession(req) || {
    userId: '00000000-0000-0000-0000-000000000002',
    organizationId: '00000000-0000-0000-0000-000000000001',
    role: 'admin',
  };

  // Admin can access any team
  if (session.role === 'admin') {
    return true;
  }

  // Manager must own the team
  const [team] = await db
    .select({ managerId: teams.managerId, organizationId: teams.organizationId })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!team) {
    reply.status(404).send({
      error: { code: 'TEAM_NOT_FOUND', message: 'Team not found' },
    });
    return false;
  }

  // Check tenant isolation
  if (team.organizationId !== session.organizationId) {
    reply.status(403).send({
      error: { code: 'FORBIDDEN', message: 'Team belongs to different organization' },
    });
    return false;
  }

  if (team.managerId !== session.userId) {
    reply.status(403).send({
      error: { code: 'FORBIDDEN', message: 'Not your team' },
    });
    return false;
  }

  return true;
}

export async function registerManagerAnalyticsRoutes(app: FastifyInstance) {
  /**
   * GET /api/manager/teams/:teamId/analytics
   * Get team comprehension metrics
   * RBAC: manager (owns team) or admin
   * Feature Flag: FF_MANAGER_DASHBOARD_V1
   */
  app.get(
    '/api/manager/teams/:teamId/analytics',
    async (req: FastifyRequest<{ Params: { teamId: string }; Querystring: { trackId?: string; refresh?: string } }>, reply: FastifyReply) => {
      // Check feature flag
      if (!FF_MANAGER_DASHBOARD_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' },
        });
      }

      // Check RBAC
      if (!requireManager(req, reply)) return reply;

      const { teamId } = req.params;
      const { trackId, refresh } = req.query;

      // Verify ownership
      if (!(await verifyTeamOwnership(req, reply, teamId))) return reply;

      try {
        const forceRefresh = refresh === 'true';
        const analytics = await computeTeamAnalytics(teamId, trackId, forceRefresh);

        // Add observability headers
        reply.header('x-analytics-source', forceRefresh ? 'computed' : 'cached');
        reply.header('x-cache', forceRefresh ? 'miss' : 'hit');

        return reply.status(200).send(analytics);
      } catch (error: any) {
        console.error('[manager-analytics] Error computing team analytics:', error);
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to compute analytics', details: error.message },
        });
      }
    }
  );

  /**
   * GET /api/manager/teams/:teamId/at-risk
   * Get at-risk learners for intervention
   * RBAC: manager (owns team) or admin
   * Feature Flag: FF_MANAGER_DASHBOARD_V1
   */
  app.get(
    '/api/manager/teams/:teamId/at-risk',
    async (
      req: FastifyRequest<{
        Params: { teamId: string };
        Querystring: { trackId?: string; limit?: string; offset?: string };
      }>,
      reply: FastifyReply
    ) => {
      // Check feature flag
      if (!FF_MANAGER_DASHBOARD_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' },
        });
      }

      // Check RBAC
      if (!requireManager(req, reply)) return reply;

      const { teamId } = req.params;
      const { trackId, limit = '50', offset = '0' } = req.query;

      // Verify ownership
      if (!(await verifyTeamOwnership(req, reply, teamId))) return reply;

      try {
        // Parse and cap pagination
        const parsedLimit = Math.min(parseInt(limit, 10) || 50, 200);
        const parsedOffset = parseInt(offset, 10) || 0;

        const result = await getAtRiskLearners(teamId, trackId, parsedLimit, parsedOffset);

        // Add observability headers
        reply.header('x-analytics-sample', result.total.toString());
        reply.header('x-pagination-limit', parsedLimit.toString());
        reply.header('x-pagination-offset', parsedOffset.toString());

        return reply.status(200).send({
          learners: result.learners,
          total: result.total,
          limit: parsedLimit,
          offset: parsedOffset,
        });
      } catch (error: any) {
        console.error('[manager-analytics] Error getting at-risk learners:', error);
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to get at-risk learners', details: error.message },
        });
      }
    }
  );

  /**
   * GET /api/manager/teams/:teamId/retention
   * Get retention curve (D0, D7, D14, D30)
   * RBAC: manager (owns team) or admin
   * Feature Flag: FF_MANAGER_DASHBOARD_V1
   */
  app.get(
    '/api/manager/teams/:teamId/retention',
    async (req: FastifyRequest<{ Params: { teamId: string }; Querystring: { trackId?: string } }>, reply: FastifyReply) => {
      // Check feature flag
      if (!FF_MANAGER_DASHBOARD_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' },
        });
      }

      // Check RBAC
      if (!requireManager(req, reply)) return reply;

      const { teamId } = req.params;
      const { trackId } = req.query;

      // Verify ownership
      if (!(await verifyTeamOwnership(req, reply, teamId))) return reply;

      try {
        const retentionCurve = await computeRetentionCurve(teamId, trackId);

        // Add observability headers
        const totalSamples = retentionCurve.reduce((sum, point) => sum + point.sampleSize, 0);
        reply.header('x-analytics-sample', totalSamples.toString());

        return reply.status(200).send(retentionCurve);
      } catch (error: any) {
        console.error('[manager-analytics] Error computing retention curve:', error);
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to compute retention curve', details: error.message },
        });
      }
    }
  );

  /**
   * GET /api/manager/teams/:teamId/performance
   * Get per-track performance breakdown
   * RBAC: manager (owns team) or admin
   * Feature Flag: FF_MANAGER_DASHBOARD_V1
   */
  app.get(
    '/api/manager/teams/:teamId/performance',
    async (
      req: FastifyRequest<{
        Params: { teamId: string };
        Querystring: { limit?: string; offset?: string };
      }>,
      reply: FastifyReply
    ) => {
      // Check feature flag
      if (!FF_MANAGER_DASHBOARD_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' },
        });
      }

      // Check RBAC
      if (!requireManager(req, reply)) return reply;

      const { teamId } = req.params;
      const { limit = '50', offset = '0' } = req.query;

      // Verify ownership
      if (!(await verifyTeamOwnership(req, reply, teamId))) return reply;

      try {
        // Parse and cap pagination
        const parsedLimit = Math.min(parseInt(limit, 10) || 50, 200);
        const parsedOffset = parseInt(offset, 10) || 0;

        const result = await getTrackPerformance(teamId, parsedLimit, parsedOffset);

        // Add observability headers
        reply.header('x-analytics-sample', result.total.toString());
        reply.header('x-pagination-limit', parsedLimit.toString());
        reply.header('x-pagination-offset', parsedOffset.toString());

        return reply.status(200).send({
          tracks: result.tracks,
          total: result.total,
          limit: parsedLimit,
          offset: parsedOffset,
        });
      } catch (error: any) {
        console.error('[manager-analytics] Error getting track performance:', error);
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to get track performance', details: error.message },
        });
      }
    }
  );

  /**
   * GET /api/analytics/organization/:orgId/overview
   * Get organization-level analytics overview
   * RBAC: admin only
   * Feature Flag: FF_ANALYTICS_PILOT_V1
   */
  app.get(
    '/api/analytics/organization/:orgId/overview',
    async (req: FastifyRequest<{ Params: { orgId: string } }>, reply: FastifyReply) => {
      // Check feature flag
      if (!FF_ANALYTICS_PILOT_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' },
        });
      }

      // Check RBAC (admin only)
      if (!requireAdmin(req, reply)) return reply;

      const { orgId } = req.params;

      const session = getSession(req) || {
        userId: '00000000-0000-0000-0000-000000000002',
        organizationId: '00000000-0000-0000-0000-000000000001',
        role: 'admin',
      };

      // Verify tenant isolation
      if (session.organizationId !== orgId && session.role !== 'admin') {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Cannot access other organization data' },
        });
      }

      try {
        const overview = await getOrganizationOverview(orgId);

        // Add observability headers
        reply.header('x-analytics-source', 'computed');
        reply.header('x-cache', 'hit');

        return reply.status(200).send(overview);
      } catch (error: any) {
        console.error('[manager-analytics] Error getting organization overview:', error);
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to get organization overview', details: error.message },
        });
      }
    }
  );

  /**
   * GET /api/analytics/organization/:orgId/export
   * Export organization analytics as CSV or JSON
   * RBAC: admin only
   * Feature Flag: FF_ANALYTICS_PILOT_V1
   */
  app.get(
    '/api/analytics/organization/:orgId/export',
    async (
      req: FastifyRequest<{
        Params: { orgId: string };
        Querystring: { format?: string; pii?: string };
      }>,
      reply: FastifyReply
    ) => {
      // Check feature flag
      if (!FF_ANALYTICS_PILOT_V1) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature not enabled' },
        });
      }

      // Check RBAC (admin only)
      if (!requireAdmin(req, reply)) return reply;

      const { orgId } = req.params;
      const { format = 'json', pii = 'redacted' } = req.query;

      const session = getSession(req) || {
        userId: '00000000-0000-0000-0000-000000000002',
        organizationId: '00000000-0000-0000-0000-000000000001',
        role: 'admin',
      };

      // Verify tenant isolation
      if (session.organizationId !== orgId && session.role !== 'admin') {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Cannot access other organization data' },
        });
      }

      try {
        // Get all teams in organization
        const orgTeams = await db
          .select({
            id: teams.id,
            name: teams.name,
          })
          .from(teams)
          .where(eq(teams.organizationId, orgId));

        // Get analytics for each team
        const teamAnalytics = await Promise.all(
          orgTeams.map(async (team) => {
            const analytics = await computeTeamAnalytics(team.id);
            const atRisk = await getAtRiskLearners(team.id, undefined, 100, 0);

            return {
              team_id: team.id,
              team_name: team.name,
              active_learners: analytics.activeLearners,
              avg_comprehension: analytics.avgComprehension,
              at_risk_count: analytics.atRiskCount,
              total_attempts: analytics.totalAttempts,
              completion_rate: analytics.completionRate,
              trending_up: analytics.trendingUp,
              at_risk_learners: pii === 'redacted'
                ? atRisk.learners.map((l) => ({
                    email_hash: Buffer.from(l.email).toString('base64'),
                    comprehension_rate: l.comprehensionRate,
                    total_attempts: l.totalAttempts,
                    overdue_reviews: l.overdueReviews,
                  }))
                : atRisk.learners,
            };
          })
        );

        if (format === 'csv') {
          // Generate CSV
          const csvHeaders = [
            'team_id',
            'team_name',
            'active_learners',
            'avg_comprehension',
            'at_risk_count',
            'total_attempts',
            'completion_rate',
            'trending_up',
          ];

          const csvRows = teamAnalytics.map((t) =>
            [
              t.team_id,
              `"${t.team_name}"`,
              t.active_learners,
              t.avg_comprehension.toFixed(3),
              t.at_risk_count,
              t.total_attempts,
              t.completion_rate.toFixed(3),
              t.trending_up ? 'true' : 'false',
            ].join(',')
          );

          const csv = [csvHeaders.join(','), ...csvRows].join('\n');

          reply.header('Content-Type', 'text/csv');
          reply.header(
            'Content-Disposition',
            `attachment; filename="analytics-${orgId}-${new Date().toISOString()}.csv"`
          );

          return reply.send(csv);
        }

        // Default: JSON export
        return reply.status(200).send({
          organization_id: orgId,
          exported_at: new Date().toISOString(),
          pii_mode: pii,
          teams: teamAnalytics,
        });
      } catch (error: any) {
        console.error('[manager-analytics] Error exporting analytics:', error);
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to export analytics', details: error.message },
        });
      }
    }
  );

  /**
   * POST /api/analytics/cache/clear
   * Clear analytics cache (admin only)
   * RBAC: admin only
   */
  app.post(
    '/api/analytics/cache/clear',
    async (req: FastifyRequest<{ Body: { pattern?: string } }>, reply: FastifyReply) => {
      // Check RBAC (admin only)
      if (!requireAdmin(req, reply)) return reply;

      try {
        const { pattern } = req.body || {};
        clearAnalyticsCache(pattern);

        return reply.status(200).send({
          message: pattern ? `Cache cleared (pattern: ${pattern})` : 'Cache cleared (all)',
        });
      } catch (error: any) {
        console.error('[manager-analytics] Error clearing cache:', error);
        return reply.status(500).send({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to clear cache', details: error.message },
        });
      }
    }
  );
}

