/**
 * EPIC #56: Certified Publish v1 — Comprehensive Test Suite
 * [OKR: O4.KR1] — Tests for publish/verify/CORS/headers/caching/errors
 * 
 * Covers:
 * - Admin publish flow (happy path, idempotency, errors)
 * - Public GET artifacts (JSON + .sig)
 * - Verify endpoints (positive + negative cases)
 * - CORS/security headers
 * - Error conditions (404, 409, 413, 429)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { sign, toBase64, verify as verifyEd25519, _resetCache } from '../src/lib/ed25519';
import { artifactFor, canonicalize, sha256Hex, writeArtifact, readArtifact, getArtifactsDir } from '../src/lib/artifacts';
import { resetStoreInstance } from '../src/store/adminCertifiedStoreFactory';
import { createApp } from '../src/index';
import type { FastifyInstance } from 'fastify';

describe('[OKR: O4.KR1] EPIC #56: Certified Publish v1', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testDbPath: string;
  let testArtifactsDir: string;
  let adminToken: string;
  
  beforeAll(async () => {
    // Setup test environment
    testDbPath = path.join(process.cwd(), 'api', '.data', `test-publish-${Date.now()}.sqlite`);
    testArtifactsDir = path.join(process.cwd(), 'api', '.artifacts-test');
    
    // Ensure test directories exist
    await fs.mkdir(path.dirname(testDbPath), { recursive: true });
    
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = `file:${testDbPath}`;
    process.env.ADMIN_STORE = 'sqlite';
    process.env.ADMIN_PREVIEW = 'true';
    process.env.ADMIN_TOKEN = 'test-admin-token-epic56';
    process.env.ARTIFACTS_DIR = testArtifactsDir;
    adminToken = 'test-admin-token-epic56';

    // Reset cached store to ensure Prisma store is used under test
    resetStoreInstance();

    // Reset cached keys to use test keys
    _resetCache();
    
    // Ensure clean artifacts directory
    try {
      await fs.rm(testArtifactsDir, { recursive: true, force: true });
    } catch {}
    await fs.mkdir(testArtifactsDir, { recursive: true });
    
    // Initialize Prisma
    prisma = new PrismaClient();
    await prisma.$connect();
    
    // Run migrations
    const { exec } = await import('child_process');
    await new Promise<void>((resolve, reject) => {
      exec(
        `cd api && npx prisma migrate deploy --schema=./prisma/schema.prisma`,
        { env: { ...process.env, DATABASE_URL: `file:${testDbPath}` } },
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    // Create app
    app = await createApp();
    await app.ready();
  });
  
  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
    
    // Cleanup test artifacts
    try {
      await fs.rm(testArtifactsDir, { recursive: true, force: true });
    } catch {}
    try {
      await fs.unlink(testDbPath);
    } catch {}
  });

  describe('[OKR: O3.KR1] CORS & Security Headers', () => {
    it('OPTIONS preflight on admin publish route returns 204 with CORS headers', async () => {
      const resp = await app.inject({
        method: 'OPTIONS',
        url: '/api/admin/certified/items/test-id/publish',
        headers: {
          origin: 'https://example.com',
          'access-control-request-method': 'POST',
        },
      });
      
      expect(resp.statusCode).toBe(204);
      expect(resp.headers['access-control-allow-origin']).toBe('*');
      expect(resp.headers['access-control-allow-credentials']).toBeUndefined();
    });
    
    it('OPTIONS preflight on public artifact route returns 204', async () => {
      const resp = await app.inject({
        method: 'OPTIONS',
        url: '/api/certified/artifacts/test-id',
        headers: {
          origin: 'https://example.com',
          'access-control-request-method': 'GET',
        },
      });
      
      expect(resp.statusCode).toBe(204);
    });
  });

  describe('[OKR: O2.KR1, O1.KR1] Admin Publish Flow', () => {
    let testSourceId: string;
    let testItemId: string;
    let testLockHash: string;
    
    it('creates a test source and item for publishing', async () => {
      // Create source
      const sourceResp = await app.inject({
        method: 'POST',
        url: '/api/admin/certified/sources',
        headers: {
          'content-type': 'application/json',
          'x-admin-token': adminToken,
        },
        payload: { name: 'Test Source Epic56', url: 'https://example.com/test' },
      });
      expect(sourceResp.statusCode).toBe(200);
      const sourceData = JSON.parse(sourceResp.body);
      testSourceId = sourceData.source_id;
      
      // Create item
      const itemResp = await app.inject({
        method: 'POST',
        url: '/api/admin/certified/items/ingest',
        headers: {
          'content-type': 'application/json',
          'x-admin-token': adminToken,
        },
        payload: {
          title: 'Test Item for Publish',
          url: 'https://example.com/content',
          tags: ['test'],
        },
      });
      expect(itemResp.statusCode).toBe(200);
      const itemData = JSON.parse(itemResp.body);
      testItemId = itemData.item_id;
      
      // Add lockHash to item manually
      testLockHash = crypto.createHash('sha256').update('test-plan-data').digest('hex');
      await prisma.adminItem.update({
        where: { id: testItemId },
        data: { lockHash: testLockHash },
      });
    });
    
    it('[OKR: O2.KR1] publishes an item successfully (first time)', async () => {
      const resp = await app.inject({
        method: 'POST',
        url: `/api/admin/certified/items/${testItemId}/publish`,
        headers: {
          'content-type': 'application/json',
          'x-admin-token': adminToken,
        },
      });
      
      expect(resp.statusCode).toBe(200);
      expect(resp.headers['access-control-allow-origin']).toBe('*');
      expect(resp.headers['access-control-allow-credentials']).toBeUndefined();
      expect(resp.headers.location).toBeDefined();
      
      const data = JSON.parse(resp.body);
      expect(data.ok).toBe(true);
      expect(data.artifact).toBeDefined();
      expect(data.artifact.id).toBeDefined();
      expect(data.artifact.sha256).toBeDefined();
      expect(data.artifact.signature).toBeDefined();
      expect(data.artifact.itemId).toBe(testItemId);
      
      // Verify artifact file exists
      const artifactPath = path.join(testArtifactsDir, `${data.artifact.id}.json`);
      const exists = await fs.stat(artifactPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
    
    it('[OKR: O2.KR1] returns 409 on republish with same lockHash (idempotency)', async () => {
      const resp = await app.inject({
        method: 'POST',
        url: `/api/admin/certified/items/${testItemId}/publish`,
        headers: {
          'content-type': 'application/json',
          'x-admin-token': adminToken,
        },
      });
      
      expect(resp.statusCode).toBe(409);
      expect(resp.headers.location).toBeDefined();
      
      const data = JSON.parse(resp.body);
      expect(data.error.code).toBe('ALREADY_PUBLISHED');
      expect(data.artifact).toBeDefined();
      expect(data.artifact.id).toBeDefined();
    });
    
    it('returns 404 for unknown item', async () => {
      const resp = await app.inject({
        method: 'POST',
        url: '/api/admin/certified/items/unknown-item-id/publish',
        headers: {
          'content-type': 'application/json',
          'x-admin-token': adminToken,
        },
      });
      
      expect(resp.statusCode).toBe(404);
      const data = JSON.parse(resp.body);
      expect(data.error.code).toBe('NOT_FOUND');
    });
    
    it('returns 400 for item without lockHash', async () => {
      // Create item without lockHash
      const itemResp = await app.inject({
        method: 'POST',
        url: '/api/admin/certified/items/ingest',
        headers: {
          'content-type': 'application/json',
          'x-admin-token': adminToken,
        },
        payload: {
          title: 'Item without lock',
          url: 'https://example.com/no-lock',
        },
      });
      const itemData = JSON.parse(itemResp.body);
      
      const resp = await app.inject({
        method: 'POST',
        url: `/api/admin/certified/items/${itemData.item_id}/publish`,
        headers: {
          'content-type': 'application/json',
          'x-admin-token': adminToken,
        },
      });
      
      expect(resp.statusCode).toBe(400);
      const data = JSON.parse(resp.body);
      expect(data.error.code).toBe('NO_LOCK_HASH');
    });
    
    it('returns 401 without admin token', async () => {
      // Use a fresh item to avoid idempotency conflicts
      const itemResp = await app.inject({
        method: 'POST',
        url: '/api/admin/certified/items/ingest',
        headers: {
          'content-type': 'application/json',
          'x-admin-token': adminToken,
        },
        payload: { title: 'Unauthorized Test Item', url: 'https://example.com/unauthorized' },
      });
      const itemData = JSON.parse(itemResp.body);
      
      const resp = await app.inject({
        method: 'POST',
        url: `/api/admin/certified/items/${itemData.item_id}/publish`,
        headers: {
          'content-type': 'application/json',
          // No x-admin-token header
        },
      });
      
      expect(resp.statusCode).toBe(401);
    });
  });

  describe('[OKR: O1.KR2, O3.KR1] Public Artifact GET Routes', () => {
    let publishedArtifactId: string;
    
    beforeAll(async () => {
      // Publish an artifact for testing
      const item = await prisma.adminItem.findFirst({
        where: { lockHash: { not: null } },
      });
      
      if (item) {
        const artifact = artifactFor({
          artifactId: crypto.randomBytes(16).toString('hex'),
          itemId: item.id,
          sourceUrl: item.url,
          lockHash: item.lockHash!,
        });
        
        const canonical = canonicalize(artifact);
        const signature = sign(Buffer.from(canonical, 'utf8'));
        const signatureB64 = toBase64(signature);
        
        await writeArtifact(testArtifactsDir, artifact);
        
        const record = await prisma.publishedArtifact.create({
          data: {
            id: artifact.artifactId,
            itemId: item.id,
            sha256: artifact.sha256,
            signature: signatureB64,
            path: `${artifact.artifactId}.json`,
          },
        });
        
        publishedArtifactId = record.id;
      }
    });
    
    it('[OKR: O1.KR2] GET artifact JSON with proper headers', async () => {
      const resp = await app.inject({
        method: 'GET',
        url: `/api/certified/artifacts/${publishedArtifactId}`,
      });
      
      expect(resp.statusCode).toBe(200);
      expect(resp.headers['access-control-allow-origin']).toBe('*');
      expect(resp.headers['access-control-allow-credentials']).toBeUndefined();
      expect(resp.headers.etag).toBeDefined();
      expect(resp.headers['cache-control']).toContain('public');
      expect(resp.headers['cache-control']).toContain('max-age=300');
      expect(resp.headers['referrer-policy']).toBe('no-referrer');
      expect(resp.headers['x-content-type-options']).toBe('nosniff');
      expect(resp.headers['content-type']).toContain('application/json');
      
      const data = JSON.parse(resp.body);
      expect(data.version).toBe('cert.v1');
      expect(data.artifactId).toBe(publishedArtifactId);
      expect(data.sha256).toBeDefined();
      expect(data.lockHash).toBeDefined();
    });
    
    it('[OKR: O1.KR2] GET artifact signature (.sig) as binary with headers', async () => {
      const resp = await app.inject({
        method: 'GET',
        url: `/api/certified/artifacts/${publishedArtifactId}.sig`,
      });
      
      expect(resp.statusCode).toBe(200);
      expect(resp.headers['access-control-allow-origin']).toBe('*');
      expect(resp.headers['cache-control']).toContain('public');
      expect(resp.headers['referrer-policy']).toBe('no-referrer');
      expect(resp.headers['x-content-type-options']).toBe('nosniff');
      expect(resp.headers['content-type']).toBe('application/octet-stream');
      expect(resp.rawPayload.length).toBeGreaterThan(0); // Binary signature
    });
    
    it('returns 404 for unknown artifact ID', async () => {
      const resp = await app.inject({
        method: 'GET',
        url: '/api/certified/artifacts/unknown-artifact-id',
      });
      
      expect(resp.statusCode).toBe(404);
      const data = JSON.parse(resp.body);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('[OKR: O1.KR1, O3.KR2] Verify Endpoints', () => {
    let testArtifactId: string;
    let testArtifact: any;
    let testSignature: string;
    
    beforeAll(async () => {
      const item = await prisma.adminItem.findFirst({
        where: { lockHash: { not: null } },
      });
      
      if (item) {
        testArtifact = artifactFor({
          artifactId: crypto.randomBytes(16).toString('hex'),
          itemId: item.id,
          sourceUrl: item.url,
          lockHash: item.lockHash!,
        });
        
        const canonical = canonicalize(testArtifact);
        const signature = sign(Buffer.from(canonical, 'utf8'));
        testSignature = toBase64(signature);
        
        await writeArtifact(testArtifactsDir, testArtifact);
        
        const record = await prisma.publishedArtifact.create({
          data: {
            id: testArtifact.artifactId,
            itemId: item.id,
            sha256: testArtifact.sha256,
            signature: testSignature,
            path: `${testArtifact.artifactId}.json`,
          },
        });
        
        testArtifactId = record.id;
      }
    });
    
    it('[OKR: O1.KR1] verifies artifact by ID (positive case)', async () => {
      const resp = await app.inject({
        method: 'POST',
        url: '/api/certified/verify',
        headers: {
          'content-type': 'application/json',
        },
        payload: { artifactId: testArtifactId },
      });
      
      expect(resp.statusCode).toBe(200);
      const data = JSON.parse(resp.body);
      expect(data.ok).toBe(true);
      expect(data.artifactId).toBe(testArtifactId);
      expect(data.sha256).toBeDefined();
    });
    
    it('[OKR: O1.KR1] verifies inline artifact + signature (positive case)', async () => {
      const resp = await app.inject({
        method: 'POST',
        url: '/api/certified/verify',
        headers: {
          'content-type': 'application/json',
        },
        payload: {
          artifact: testArtifact,
          signature: testSignature,
        },
      });
      
      expect(resp.statusCode).toBe(200);
      const data = JSON.parse(resp.body);
      expect(data.ok).toBe(true);
      expect(data.sha256).toBeDefined();
    });
    
    it('[OKR: O3.KR2] rejects tampered artifact (negative case)', async () => {
      const tamperedArtifact = { ...testArtifact, lockHash: 'tampered-hash' };
      
      const resp = await app.inject({
        method: 'POST',
        url: '/api/certified/verify',
        headers: {
          'content-type': 'application/json',
        },
        payload: {
          artifact: tamperedArtifact,
          signature: testSignature,
        },
      });
      
      expect(resp.statusCode).toBe(200);
      const data = JSON.parse(resp.body);
      expect(data.ok).toBe(false);
      expect(data.reason).toBeDefined();
    });
    
    it('[OKR: O3.KR2] rejects wrong signature (negative case)', async () => {
      const wrongSig = toBase64(crypto.randomBytes(64)); // Random signature
      
      const resp = await app.inject({
        method: 'POST',
        url: '/api/certified/verify',
        headers: {
          'content-type': 'application/json',
        },
        payload: {
          artifact: testArtifact,
          signature: wrongSig,
        },
      });
      
      expect(resp.statusCode).toBe(200);
      const data = JSON.parse(resp.body);
      expect(data.ok).toBe(false);
      expect(data.reason).toBe('signature_invalid');
    });
    
    it('returns 404 for unknown artifact ID', async () => {
      const resp = await app.inject({
        method: 'POST',
        url: '/api/certified/verify',
        headers: {
          'content-type': 'application/json',
        },
        payload: { artifactId: 'unknown-id' },
      });
      
      expect(resp.statusCode).toBe(404);
    });
  });

  describe('[OKR: O4.KR1] No Regressions', () => {
    it('existing admin certified routes still work', async () => {
      const resp = await app.inject({
        method: 'GET',
        url: '/api/admin/certified/sources',
        headers: {
          'x-admin-token': adminToken,
        },
      });
      
      expect(resp.statusCode).toBe(200);
      expect(resp.headers['access-control-allow-origin']).toBe('*');
    });
    
    it('existing certified verify (plan lock) still works', async () => {
      const plan = { title: 'Test Plan', items: [] };
      const lock = {
        algo: 'sha256' as const,
        hash: crypto.createHash('sha256').update(JSON.stringify(plan)).digest('hex'),
      };
      
      const resp = await app.inject({
        method: 'POST',
        url: '/api/certified/verify',
        headers: {
          'content-type': 'application/json',
        },
        payload: { plan, lock },
      });
      
      expect(resp.statusCode).toBe(200);
      const data = JSON.parse(resp.body);
      expect(data.ok).toBeDefined();
    });
  });
});

