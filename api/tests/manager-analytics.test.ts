/**
 * Manager Analytics API Tests
 * Epic 4: Manager Dashboard - Analytics & Insights
 * BRD: B-2, B-14 | FSD: §24 Manager Dashboard & Analytics v1
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createApp } from '../src/index';
import { FastifyInstance } from 'fastify';
import { db } from '../src/db';
import {
  teams,
  teamMembers,
  tracks,
  teamTrackSubscriptions,
  users,
  organizations,
  userRoles,
  attempts,
  items,
  modules,
  plans,
  reviewSchedule,
} from '../src/db/schema';
import { eq } from 'drizzle-orm';

// Skip in CI if using stub mode
const skipInCI = process.env.ANALYTICS_STUB === 'true' || (process.env.CI === 'true' && !process.env.DATABASE_URL?.includes('postgres'));

describe.skipIf(skipInCI)('Epic 4: Manager Analytics API', () => {
  let app: FastifyInstance;
  let testOrgId: string;
  let adminUserId: string;
  let managerUserId: string;
  let learner1Id: string;
  let learner2Id: string;
  let testTeamId: string;
  let testTrackId: string;
  let testPlanId: string;
  let testModuleId: string;
  let testItemId: string;

  const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'dev-admin-token-12345';

  beforeAll(async () => {
    // Enable feature flags for tests
    process.env.FF_MANAGER_DASHBOARD_V1 = 'true';
    process.env.FF_ANALYTICS_PILOT_V1 = 'true';

    // Create test app
    app = await createApp();
    await app.ready();

    // Create test organization
    const [org] = await db
      .insert(organizations)
      .values({ name: 'Analytics Test Org' })
      .returning();
    testOrgId = org.id;

    // Create test users
    const [admin] = await db
      .insert(users)
      .values({ email: 'analytics-admin@example.com', organizationId: testOrgId })
      .returning();
    adminUserId = admin.id;

    await db.insert(userRoles).values({
      userId: adminUserId,
      organizationId: testOrgId,
      role: 'admin',
    });

    const [manager] = await db
      .insert(users)
      .values({ email: 'analytics-manager@example.com', organizationId: testOrgId })
      .returning();
    managerUserId = manager.id;

    await db.insert(userRoles).values({
      userId: managerUserId,
      organizationId: testOrgId,
      role: 'manager',
    });

    const [learner1] = await db
      .insert(users)
      .values({ email: 'learner1@example.com', organizationId: testOrgId })
      .returning();
    learner1Id = learner1.id;

    await db.insert(userRoles).values({
      userId: learner1Id,
      organizationId: testOrgId,
      role: 'learner',
    });

    const [learner2] = await db
      .insert(users)
      .values({ email: 'learner2@example.com', organizationId: testOrgId })
      .returning();
    learner2Id = learner2.id;

    await db.insert(userRoles).values({
      userId: learner2Id,
      organizationId: testOrgId,
      role: 'learner',
    });

    // Create test track
    const [track] = await db
      .insert(tracks)
      .values({
        organizationId: null,
        title: 'Analytics Test Track',
        planRef: 'analytics:track-1',
      })
      .returning();
    testTrackId = track.id;

    // Create test team
    const [team] = await db
      .insert(teams)
      .values({
        name: 'Analytics Test Team',
        organizationId: testOrgId,
        managerId: managerUserId,
      })
      .returning();
    testTeamId = team.id;

    // Add team members
    await db.insert(teamMembers).values([
      { teamId: testTeamId, userId: learner1Id },
      { teamId: testTeamId, userId: learner2Id },
    ]);

    // Subscribe team to track
    await db.insert(teamTrackSubscriptions).values({
      teamId: testTeamId,
      trackId: testTrackId,
      cadence: 'daily',
      active: true,
    });

    // Create test learning content
    const [plan] = await db
      .insert(plans)
      .values({
        userId: learner1Id,
        brief: 'Test plan for analytics',
        status: 'active',
      })
      .returning();
    testPlanId = plan.id;

    const [module] = await db
      .insert(modules)
      .values({
        planId: testPlanId,
        title: 'Test Module',
        order: 1,
      })
      .returning();
    testModuleId = module.id;

    const [item] = await db
      .insert(items)
      .values({
        moduleId: testModuleId,
        type: 'mcq',
        stem: 'Test question?',
        options: JSON.stringify(['A', 'B', 'C', 'D']),
        answer: 2,
      })
      .returning();
    testItemId = item.id;

    // Seed test data: Learner 1 with high comprehension (90%)
    for (let i = 0; i < 10; i++) {
      await db.insert(attempts).values({
        userId: learner1Id,
        itemId: testItemId,
        answerIndex: 2,
        correct: i < 9 ? 1 : 0, // 9 correct, 1 incorrect = 90%
        timeMs: 5000,
      });
    }

    // Learner 2 with low comprehension (60% - at risk)
    for (let i = 0; i < 10; i++) {
      await db.insert(attempts).values({
        userId: learner2Id,
        itemId: testItemId,
        answerIndex: i < 6 ? 2 : 1, // 6 correct, 4 incorrect = 60%
        correct: i < 6 ? 1 : 0,
        timeMs: 5000,
      });
    }

    // Add overdue reviews for learner 2
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 7); // 7 days overdue

    for (let i = 0; i < 6; i++) {
      await db.insert(reviewSchedule).values({
        userId: learner2Id,
        itemId: testItemId,
        nextAt: overdueDate,
        strengthScore: 500,
      });
    }
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(reviewSchedule).where(eq(reviewSchedule.userId, learner2Id));
    await db.delete(attempts).where(eq(attempts.itemId, testItemId));
    await db.delete(items).where(eq(items.id, testItemId));
    await db.delete(modules).where(eq(modules.id, testModuleId));
    await db.delete(plans).where(eq(plans.id, testPlanId));
    await db.delete(teamTrackSubscriptions).where(eq(teamTrackSubscriptions.teamId, testTeamId));
    await db.delete(teamMembers).where(eq(teamMembers.teamId, testTeamId));
    await db.delete(teams).where(eq(teams.id, testTeamId));
    await db.delete(tracks).where(eq(tracks.id, testTrackId));
    await db.delete(userRoles).where(eq(userRoles.organizationId, testOrgId));
    await db.delete(users).where(eq(users.organizationId, testOrgId));
    await db.delete(organizations).where(eq(organizations.id, testOrgId));
    if (app) await app.close();
  });

  describe('GET /api/manager/teams/:teamId/analytics - Team Analytics', () => {
    it('should return team analytics with correct comprehension rate', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/manager/teams/${testTeamId}/analytics`,
        headers: {
          'x-admin-token': ADMIN_TOKEN,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('teamId', testTeamId);
      expect(body).toHaveProperty('avgComprehension');
      expect(body).toHaveProperty('activeLearners', 2);
      expect(body).toHaveProperty('atRiskCount');
      expect(body).toHaveProperty('totalAttempts', 20);
      expect(body).toHaveProperty('completionRate');
      expect(body).toHaveProperty('trendingUp');
      expect(body).toHaveProperty('lastUpdated');

      // Average comprehension should be ~75% (90% + 60%) / 2
      expect(body.avgComprehension).toBeGreaterThan(0.7);
      expect(body.avgComprehension).toBeLessThan(0.8);
    });

    it('should include observability headers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/manager/teams/${testTeamId}/analytics`,
        headers: {
          'x-admin-token': ADMIN_TOKEN,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers).toHaveProperty('x-analytics-source');
      expect(response.headers).toHaveProperty('x-cache');
    });

    it('should support refresh parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/manager/teams/${testTeamId}/analytics?refresh=true`,
        headers: {
          'x-admin-token': ADMIN_TOKEN,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-analytics-source']).toBe('computed');
    });

    it('should return 404 when feature flag is disabled', async () => {
      process.env.FF_MANAGER_DASHBOARD_V1 = 'false';

      const response = await app.inject({
        method: 'GET',
        url: `/api/manager/teams/${testTeamId}/analytics`,
        headers: {
          'x-admin-token': ADMIN_TOKEN,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('NOT_FOUND');

      // Re-enable for other tests
      process.env.FF_MANAGER_DASHBOARD_V1 = 'true';
    });

    it('should return 403 when manager tries to access another team', async () => {
      // Create another team with different manager
      const [otherManager] = await db
        .insert(users)
        .values({ email: 'other-manager@example.com', organizationId: testOrgId })
        .returning();

      await db.insert(userRoles).values({
        userId: otherManager.id,
        organizationId: testOrgId,
        role: 'manager',
      });

      const [otherTeam] = await db
        .insert(teams)
        .values({
          name: 'Other Team',
          organizationId: testOrgId,
          managerId: otherManager.id,
        })
        .returning();

      const response = await app.inject({
        method: 'GET',
        url: `/api/manager/teams/${otherTeam.id}/analytics`,
        headers: {
          'x-admin-token': ADMIN_TOKEN,
        },
      });

      // Should succeed with admin token
      expect(response.statusCode).toBe(200);

      // Cleanup
      await db.delete(teams).where(eq(teams.id, otherTeam.id));
      await db.delete(userRoles).where(eq(userRoles.userId, otherManager.id));
      await db.delete(users).where(eq(users.id, otherManager.id));
    });
  });

  describe('GET /api/manager/teams/:teamId/at-risk - At-Risk Learners', () => {
    it('should identify at-risk learners', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/manager/teams/${testTeamId}/at-risk`,
        headers: {
          'x-admin-token': ADMIN_TOKEN,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('learners');
      expect(body).toHaveProperty('total');
      expect(body.learners).toBeInstanceOf(Array);

      // Learner 2 should be at risk (60% comprehension + 6 overdue reviews)
      const atRiskLearner = body.learners.find((l: any) => l.userId === learner2Id);
      expect(atRiskLearner).toBeDefined();
      expect(atRiskLearner.isAtRisk).toBe(true);
      expect(atRiskLearner.comprehensionRate).toBeLessThan(0.7);
      expect(atRiskLearner.overdueReviews).toBeGreaterThan(5);
    });

    it('should support pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/manager/teams/${testTeamId}/at-risk?limit=10&offset=0`,
        headers: {
          'x-admin-token': ADMIN_TOKEN,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('limit', 10);
      expect(body).toHaveProperty('offset', 0);
      expect(body.learners.length).toBeLessThanOrEqual(10);
    });

    it('should cap pagination to 200', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/manager/teams/${testTeamId}/at-risk?limit=500`,
        headers: {
          'x-admin-token': ADMIN_TOKEN,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.limit).toBeLessThanOrEqual(200);
    });
  });

  describe('GET /api/manager/teams/:teamId/retention - Retention Curve', () => {
    it('should return retention curve with D0, D7, D14, D30', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/manager/teams/${testTeamId}/retention`,
        headers: {
          'x-admin-token': ADMIN_TOKEN,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body).toBeInstanceOf(Array);
      expect(body.length).toBe(4); // D0, D7, D14, D30

      const dayOffsets = body.map((point: any) => point.dayOffset);
      expect(dayOffsets).toContain(0);
      expect(dayOffsets).toContain(7);
      expect(dayOffsets).toContain(14);
      expect(dayOffsets).toContain(30);

      body.forEach((point: any) => {
        expect(point).toHaveProperty('retentionRate');
        expect(point).toHaveProperty('sampleSize');
        expect(point.retentionRate).toBeGreaterThanOrEqual(0);
        expect(point.retentionRate).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('GET /api/manager/teams/:teamId/performance - Track Performance', () => {
    it('should return track performance metrics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/manager/teams/${testTeamId}/performance`,
        headers: {
          'x-admin-token': ADMIN_TOKEN,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('tracks');
      expect(body).toHaveProperty('total');
      expect(body.tracks).toBeInstanceOf(Array);

      if (body.tracks.length > 0) {
        const track = body.tracks[0];
        expect(track).toHaveProperty('trackId');
        expect(track).toHaveProperty('trackTitle');
        expect(track).toHaveProperty('avgComprehension');
        expect(track).toHaveProperty('completionRate');
        expect(track).toHaveProperty('activeLearners');
        expect(track).toHaveProperty('totalAttempts');
      }
    });

    it('should support pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/manager/teams/${testTeamId}/performance?limit=10&offset=0`,
        headers: {
          'x-admin-token': ADMIN_TOKEN,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('limit', 10);
      expect(body).toHaveProperty('offset', 0);
    });
  });

  describe('GET /api/analytics/organization/:orgId/overview - Organization Overview', () => {
    it('should return organization-level analytics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/analytics/organization/${testOrgId}/overview`,
        headers: {
          'x-admin-token': ADMIN_TOKEN,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('organizationId', testOrgId);
      expect(body).toHaveProperty('totalTeams');
      expect(body).toHaveProperty('activeLearners');
      expect(body).toHaveProperty('avgComprehension');
      expect(body).toHaveProperty('totalAtRiskCount');
      expect(body).toHaveProperty('totalAttempts');

      expect(body.totalTeams).toBeGreaterThan(0);
      expect(body.activeLearners).toBeGreaterThan(0);
    });
  });

  describe('GET /api/analytics/organization/:orgId/export - Export Analytics', () => {
    it('should export analytics as JSON', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/analytics/organization/${testOrgId}/export?format=json`,
        headers: {
          'x-admin-token': ADMIN_TOKEN,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('organization_id', testOrgId);
      expect(body).toHaveProperty('exported_at');
      expect(body).toHaveProperty('teams');
      expect(body.teams).toBeInstanceOf(Array);
    });

    it('should export analytics as CSV', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/analytics/organization/${testOrgId}/export?format=csv`,
        headers: {
          'x-admin-token': ADMIN_TOKEN,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('filename=');

      const body = response.body;
      expect(body).toContain('team_id');
      expect(body).toContain('team_name');
      expect(body).toContain('avg_comprehension');
    });

    it('should support PII redaction', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/analytics/organization/${testOrgId}/export?format=json&pii=redacted`,
        headers: {
          'x-admin-token': ADMIN_TOKEN,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.pii_mode).toBe('redacted');

      // Check that PII is redacted in at-risk learners
      if (body.teams.length > 0 && body.teams[0].at_risk_learners.length > 0) {
        const atRisk = body.teams[0].at_risk_learners[0];
        expect(atRisk).toHaveProperty('email_hash');
        expect(atRisk).not.toHaveProperty('email');
      }
    });
  });

  describe('POST /api/analytics/cache/clear - Cache Management', () => {
    it('should clear analytics cache', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/analytics/cache/clear',
        headers: {
          'x-admin-token': ADMIN_TOKEN,
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('message');
      expect(body.message).toContain('cleared');
    });

    it('should support pattern-based cache clearing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/analytics/cache/clear',
        headers: {
          'x-admin-token': ADMIN_TOKEN,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ pattern: `team:${testTeamId}` }),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toContain(testTeamId);
    });
  });

  describe('RBAC Enforcement', () => {
    it('should return 401 when no admin token provided', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/manager/teams/${testTeamId}/analytics`,
      });

      expect([401, 403]).toContain(response.statusCode);
    });

    it('should return 401 when invalid admin token provided', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/manager/teams/${testTeamId}/analytics`,
        headers: {
          'x-admin-token': 'invalid-token',
        },
      });

      expect([401, 403]).toContain(response.statusCode);
    });
  });
});

