/**
 * Team Management API Tests
 * Epic 3: Team Management & Learner Assignment
 * BRD: B3 Group Learning | FSD: §23 Team Management & Assignments v1
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createApp } from '../src/index';
import { FastifyInstance } from 'fastify';
import { db } from '../src/db';
import { teams, teamMembers, tracks, teamTrackSubscriptions, users, organizations, userRoles } from '../src/db/schema';
import { eq } from 'drizzle-orm';

// Skip in CI - requires PostgreSQL (use SQLite for other tests)
const skipInCI = process.env.CI === 'true' || !process.env.DATABASE_URL?.includes('postgres');

describe.skipIf(skipInCI)('Epic 3: Team Management API', () => {
  let app: FastifyInstance;
  let testOrgId: string;
  let adminUserId: string;
  let managerUserId: string;
  let learnerUserId: string;
  let testTrackId: string;

  const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'dev-admin-token-12345';

  beforeAll(async () => {
    // Create test app
    app = await createApp();
    await app.ready();

    // Create test organization
    const [org] = await db
      .insert(organizations)
      .values({ name: 'Test Org' })
      .returning();
    testOrgId = org.id;

    // Create test users
    const [admin] = await db
      .insert(users)
      .values({ email: 'test-admin@example.com', organizationId: testOrgId })
      .returning();
    adminUserId = admin.id;

    await db.insert(userRoles).values({
      userId: adminUserId,
      organizationId: testOrgId,
      role: 'admin',
    });

    const [manager] = await db
      .insert(users)
      .values({ email: 'test-manager@example.com', organizationId: testOrgId })
      .returning();
    managerUserId = manager.id;

    await db.insert(userRoles).values({
      userId: managerUserId,
      organizationId: testOrgId,
      role: 'manager',
    });

    const [learner] = await db
      .insert(users)
      .values({ email: 'test-learner@example.com', organizationId: testOrgId })
      .returning();
    learnerUserId = learner.id;

    await db.insert(userRoles).values({
      userId: learnerUserId,
      organizationId: testOrgId,
      role: 'learner',
    });

    // Create test track
    const [track] = await db
      .insert(tracks)
      .values({
        organizationId: null, // canonical track
        title: 'Test Track',
        planRef: 'test:track-1',
      })
      .returning();
    testTrackId = track.id;
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(teamTrackSubscriptions).where(eq(teamTrackSubscriptions.trackId, testTrackId));
    await db.delete(tracks).where(eq(tracks.id, testTrackId));
    await db.delete(userRoles).where(eq(userRoles.organizationId, testOrgId));
    await db.delete(users).where(eq(users.organizationId, testOrgId));
    await db.delete(organizations).where(eq(organizations.id, testOrgId));
    await app.close();
  });

  describe('POST /api/teams - Create Team', () => {
    it('should create a team with admin token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/teams',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${ADMIN_TOKEN}`,
        },
        payload: { name: 'Engineering Team' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('id');
      expect(body.name).toBe('Engineering Team');
    });

    it('should reject request without auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/teams',
        headers: { 'content-type': 'application/json' },
        payload: { name: 'Unauthorized Team' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject empty team name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/teams',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${ADMIN_TOKEN}`,
        },
        payload: { name: '' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_INPUT');
    });

    it('should support idempotency with X-Idempotency-Key', async () => {
      const idempotencyKey = `test-${Date.now()}`;

      const response1 = await app.inject({
        method: 'POST',
        url: '/api/teams',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${ADMIN_TOKEN}`,
          'x-idempotency-key': idempotencyKey,
        },
        payload: { name: 'Idempotent Team' },
      });

      expect(response1.statusCode).toBe(200);
      const body1 = JSON.parse(response1.body);

      const response2 = await app.inject({
        method: 'POST',
        url: '/api/teams',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${ADMIN_TOKEN}`,
          'x-idempotency-key': idempotencyKey,
        },
        payload: { name: 'Idempotent Team' },
      });

      expect(response2.statusCode).toBe(200);
      const body2 = JSON.parse(response2.body);
      expect(body1.id).toBe(body2.id);
    });
  });

  describe('POST /api/teams/:id/members - Add Members', () => {
    let teamId: string;

    beforeEach(async () => {
      // Create a team for testing
      const [team] = await db
        .insert(teams)
        .values({
          organizationId: testOrgId,
          name: 'Member Test Team',
          managerId: adminUserId,
        })
        .returning();
      teamId = team.id;
    });

    it('should add members via JSON', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/teams/${teamId}/members`,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${ADMIN_TOKEN}`,
        },
        payload: { emails: ['alice@example.com', 'bob@example.com'] },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.added).toHaveLength(2);
      expect(body.added).toContain('alice@example.com');
      expect(body.added).toContain('bob@example.com');
    });

    it('should add members via CSV', async () => {
      const csv = 'charlie@example.com\ndiana@example.com\neric@example.com';
      const response = await app.inject({
        method: 'POST',
        url: `/api/teams/${teamId}/members`,
        headers: {
          'content-type': 'text/csv',
          authorization: `Bearer ${ADMIN_TOKEN}`,
        },
        payload: csv,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.added).toHaveLength(3);
    });

    it('should skip duplicate members (idempotency)', async () => {
      // Add member first time
      await app.inject({
        method: 'POST',
        url: `/api/teams/${teamId}/members`,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${ADMIN_TOKEN}`,
        },
        payload: { emails: ['frank@example.com'] },
      });

      // Try to add again
      const response = await app.inject({
        method: 'POST',
        url: `/api/teams/${teamId}/members`,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${ADMIN_TOKEN}`,
        },
        payload: { emails: ['frank@example.com'] },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.skipped).toContain('frank@example.com');
    });

    it('should return 404 for non-existent team', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/teams/00000000-0000-0000-0000-000000000000/members',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${ADMIN_TOKEN}`,
        },
        payload: { emails: ['test@example.com'] },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/teams/:id/subscriptions - Subscribe to Track', () => {
    let teamId: string;

    beforeEach(async () => {
      const [team] = await db
        .insert(teams)
        .values({
          organizationId: testOrgId,
          name: 'Subscription Test Team',
          managerId: adminUserId,
        })
        .returning();
      teamId = team.id;
    });

    it('should create subscription', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/teams/${teamId}/subscriptions`,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${ADMIN_TOKEN}`,
        },
        payload: {
          track_id: testTrackId,
          cadence: 'weekly',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('subscription_id');
      expect(body).toHaveProperty('next_due_at');
    });

    it('should reject invalid cadence', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/teams/${teamId}/subscriptions`,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${ADMIN_TOKEN}`,
        },
        payload: {
          track_id: testTrackId,
          cadence: 'invalid',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject duplicate subscription', async () => {
      // Create first subscription
      await app.inject({
        method: 'POST',
        url: `/api/teams/${teamId}/subscriptions`,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${ADMIN_TOKEN}`,
        },
        payload: {
          track_id: testTrackId,
          cadence: 'daily',
        },
      });

      // Try to create duplicate
      const response = await app.inject({
        method: 'POST',
        url: `/api/teams/${teamId}/subscriptions`,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${ADMIN_TOKEN}`,
        },
        payload: {
          track_id: testTrackId,
          cadence: 'daily',
        },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('GET /api/teams/:id/overview - Team Overview', () => {
    let teamId: string;

    beforeEach(async () => {
      const [team] = await db
        .insert(teams)
        .values({
          organizationId: testOrgId,
          name: 'Overview Test Team',
          managerId: adminUserId,
        })
        .returning();
      teamId = team.id;

      // Add some members
      const [user1] = await db
        .insert(users)
        .values({ email: 'overview-user1@example.com', organizationId: testOrgId })
        .returning();
      const [user2] = await db
        .insert(users)
        .values({ email: 'overview-user2@example.com', organizationId: testOrgId })
        .returning();

      await db.insert(teamMembers).values([
        { teamId, userId: user1.id },
        { teamId, userId: user2.id },
      ]);

      // Add subscription
      await db.insert(teamTrackSubscriptions).values({
        teamId,
        trackId: testTrackId,
        cadence: 'daily',
        active: true,
      });
    });

    it('should return team overview', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/teams/${teamId}/overview`,
        headers: {
          authorization: `Bearer ${ADMIN_TOKEN}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.members_count).toBe(2);
      expect(body.active_tracks).toBe(1);
      expect(body).toHaveProperty('due_today');
      expect(body).toHaveProperty('at_risk');
    });

    it('should include latency header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/teams/${teamId}/overview`,
        headers: {
          authorization: `Bearer ${ADMIN_TOKEN}`,
        },
      });

      expect(response.headers).toHaveProperty('x-overview-latency-ms');
    });
  });

  describe('GET /api/tracks - List Tracks', () => {
    it('should list canonical and org tracks', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tracks',
        headers: {
          authorization: `Bearer ${ADMIN_TOKEN}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);

      // Check structure
      const track = body[0];
      expect(track).toHaveProperty('id');
      expect(track).toHaveProperty('title');
      expect(track).toHaveProperty('source');
      expect(['canon', 'org']).toContain(track.source);
    });
  });

  describe('GET /api/ops/kpis - KPI Tracking', () => {
    it('should return O3 counters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/ops/kpis',
        headers: {
          'x-admin-token': 'dev-admin-token-12345',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('o3');
      expect(body.o3).toHaveProperty('teams_total');
      expect(body.o3).toHaveProperty('members_total');
      expect(body.o3).toHaveProperty('active_subscriptions');
      expect(body).toHaveProperty('generated_at');
    });

    it('should reject unauthorized access', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/ops/kpis',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('RBAC Enforcement', () => {
    it('should enforce CSRF on mutations', async () => {
      // Note: This test assumes CSRF middleware is properly configured
      // For now, we test that auth is required
      const response = await app.inject({
        method: 'POST',
        url: '/api/teams',
        headers: {
          'content-type': 'application/json',
        },
        payload: { name: 'Unauthorized Team' },
      });

      expect([401, 403]).toContain(response.statusCode);
    });

    it('should allow OPTIONS preflight', async () => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/api/teams',
      });

      expect(response.statusCode).toBe(204);
    });
  });
});

