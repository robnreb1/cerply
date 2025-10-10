/**
 * Epic 7: Gamification Production Hardening Tests
 * 
 * Critical tests for production readiness:
 * 1. NODE_ENV=production denies admin token bypass
 * 2. Invalid UUIDs return 400 BAD_REQUEST
 * 3. Idempotency middleware (first call, replay, conflict)
 * 4. Certificate download headers
 * 5. Certificate revocation flow
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { db } from '../src/db';
import { users, learnerLevels, certificates, badges, learnerBadges, idempotencyKeys } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import gamificationRoutes from '../src/routes/gamification';

describe('Epic 7: Production Hardening', () => {
  let app: FastifyInstance;
  let testUserId: string;
  let testCertId: string;

  beforeAll(async () => {
    // Set up test environment
    process.env.FF_GAMIFICATION_V1 = 'true';
    process.env.FF_CERTIFICATES_V1 = 'true';
    process.env.FF_MANAGER_NOTIFICATIONS_V1 = 'true';
    process.env.ADMIN_TOKEN = 'test-admin-token-123';

    app = Fastify();
    await app.register(gamificationRoutes);
    await app.ready();

    // Create test user
    const [user] = await db.insert(users).values({
      email: 'prod-test@example.com',
      name: 'Production Test User',
      role: 'learner',
    }).returning();
    testUserId = user.id;

    // Create test certificate
    const [cert] = await db.insert(certificates).values({
      userId: testUserId,
      trackId: 'track-1',
      signature: 'test-signature',
      verificationUrl: 'https://example.com/verify',
    }).returning();
    testCertId = cert.id;
  });

  afterAll(async () => {
    // Clean up
    await db.delete(certificates).where(eq(certificates.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(idempotencyKeys);
    await app.close();
  });

  describe('Admin Token Bypass - Production Gating', () => {
    it('should deny admin token bypass when NODE_ENV=production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await app.inject({
        method: 'GET',
        url: `/api/learners/${testUserId}/levels`,
        headers: {
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('UNAUTHORIZED');

      process.env.NODE_ENV = originalEnv;
    });

    it('should allow admin token bypass when NODE_ENV=development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await app.inject({
        method: 'GET',
        url: `/api/learners/${testUserId}/levels`,
        headers: {
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
        },
      });

      expect(response.statusCode).toBe(200);

      process.env.NODE_ENV = originalEnv;
    });

    it('should allow admin token bypass when NODE_ENV is undefined (default dev)', async () => {
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      const response = await app.inject({
        method: 'GET',
        url: `/api/learners/${testUserId}/levels`,
        headers: {
          'x-admin-token': process.env.ADMIN_TOKEN,
        },
      });

      expect(response.statusCode).toBe(200);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('UUID Validation', () => {
    it('should return 400 for invalid UUID in learner level endpoint', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/learners/not-a-uuid/levels',
        headers: {
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('BAD_REQUEST');
      expect(body.error.message).toContain('Invalid UUID');
    });

    it('should return 400 for invalid UUID in certificate download', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/certificates/invalid-uuid/download',
        headers: {
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('BAD_REQUEST');
      expect(body.error.message).toContain('Invalid UUID');
    });

    it('should return 400 for invalid UUID in certificate verify', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/certificates/not-valid/verify?signature=test',
        headers: {
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('BAD_REQUEST');
    });

    it('should accept valid UUID format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/certificates/${testCertId}/verify`,
        headers: {
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
        },
        query: {
          signature: 'test-signature',
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Idempotency Middleware', () => {
    const idempotencyKey = `test-key-${Date.now()}`;

    it('should process first call normally', async () => {
      // Clean up any existing keys
      await db.delete(idempotencyKeys).where(eq(idempotencyKeys.key, idempotencyKey));

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/manager/notifications/00000000-0000-0000-0000-000000000001`,
        headers: {
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
          'X-Idempotency-Key': idempotencyKey,
        },
        payload: {
          read: true,
        },
      });

      // First call should process (may fail due to not being a manager, but should not replay)
      expect(response.headers['x-idempotency-replay']).toBeUndefined();
    });

    it('should replay identical request with same key', async () => {
      // Create a notification patch request
      const payload = { read: true };
      const notificationId = '00000000-0000-0000-0000-000000000002';
      const replayKey = `replay-key-${Date.now()}`;

      // First request
      const firstResponse = await app.inject({
        method: 'PATCH',
        url: `/api/manager/notifications/${notificationId}`,
        headers: {
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
          'X-Idempotency-Key': replayKey,
        },
        payload,
      });

      const firstStatusCode = firstResponse.statusCode;

      // Second request with same key and body
      const secondResponse = await app.inject({
        method: 'PATCH',
        url: `/api/manager/notifications/${notificationId}`,
        headers: {
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
          'X-Idempotency-Key': replayKey,
        },
        payload,
      });

      expect(secondResponse.statusCode).toBe(firstStatusCode);
      expect(secondResponse.headers['x-idempotency-replay']).toBe('true');
      expect(secondResponse.body).toBe(firstResponse.body);
    });

    it('should return 409 for conflicting request with same key', async () => {
      const conflictKey = `conflict-key-${Date.now()}`;
      const notificationId = '00000000-0000-0000-0000-000000000003';

      // First request with payload A
      await app.inject({
        method: 'PATCH',
        url: `/api/manager/notifications/${notificationId}`,
        headers: {
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
          'X-Idempotency-Key': conflictKey,
        },
        payload: { read: true },
      });

      // Second request with different payload B but same key
      const conflictResponse = await app.inject({
        method: 'PATCH',
        url: `/api/manager/notifications/${notificationId}`,
        headers: {
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
          'X-Idempotency-Key': conflictKey,
        },
        payload: { read: false }, // Different payload
      });

      expect(conflictResponse.statusCode).toBe(409);
      const body = JSON.parse(conflictResponse.body);
      expect(body.error.code).toBe('CONFLICT');
      expect(body.error.message).toContain('Idempotency key already used');
    });
  });

  describe('Certificate Download Headers', () => {
    it('should include correct Content-Type header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/certificates/${testCertId}/download`,
        headers: {
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
        },
      });

      expect(response.headers['content-type']).toBe('application/pdf');
    });

    it('should include Content-Disposition header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/certificates/${testCertId}/download`,
        headers: {
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
        },
      });

      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('certificate-');
    });

    it('should include Cache-Control header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/certificates/${testCertId}/download`,
        headers: {
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
        },
      });

      expect(response.headers['cache-control']).toBe('private, max-age=3600');
    });
  });

  describe('Certificate Revocation Flow', () => {
    let revokeTestCertId: string;

    beforeAll(async () => {
      // Create a fresh certificate for revocation tests
      const [cert] = await db.insert(certificates).values({
        userId: testUserId,
        trackId: 'track-revoke-test',
        signature: 'revoke-test-signature',
        verificationUrl: 'https://example.com/verify-revoke',
      }).returning();
      revokeTestCertId = cert.id;
    });

    it('should verify certificate as valid before revocation', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/certificates/${revokeTestCertId}/verify`,
        headers: {
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
        },
        query: {
          signature: 'revoke-test-signature',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.valid).toBe(true);
      expect(body.revoked).toBe(false);
    });

    it('should revoke certificate with admin token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/certificates/${revokeTestCertId}/revoke`,
        headers: {
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
          'X-Idempotency-Key': `revoke-${revokeTestCertId}`,
        },
        payload: {
          reason: 'Test revocation',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.revokedAt).toBeDefined();
      expect(body.reason).toBe('Test revocation');
    });

    it('should verify certificate as revoked after revocation', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/certificates/${revokeTestCertId}/verify`,
        headers: {
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
        },
        query: {
          signature: 'revoke-test-signature',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.valid).toBe(false);
      expect(body.revoked).toBe(true);
      expect(body.reason).toBe('Test revocation');
    });
  });
});

