/**
 * Public Certified Artifacts routes
 * [OKR: O1.KR2, O3.KR1] — CDN-ready artifact delivery with proper headers
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { readArtifact, getArtifactsDir, canonicalize, sha256Hex } from '../lib/artifacts';
import { fromBase64, verify as verifySignature } from '../lib/ed25519';

function setPublicHeaders(reply: FastifyReply) {
  reply.header('access-control-allow-origin', '*');
  try { (reply as any).removeHeader?.('access-control-allow-credentials'); } catch {}
  reply.header('referrer-policy', 'no-referrer');
  reply.header('x-content-type-options', 'nosniff');
}

export async function registerCertifiedArtifactsRoutes(app: FastifyInstance) {
  // GET /api/certified/artifacts/:artifactId — JSON artifact [OKR: O1.KR2]
  app.get('/api/certified/artifacts/:artifactId', { config: { public: true } }, async (req: FastifyRequest, reply: FastifyReply) => {
    const prisma = new PrismaClient();
    try {
      const { artifactId } = (req as any).params as { artifactId: string };
      const cleanId = artifactId.replace(/\.json$/, '');

      const record = await prisma.publishedArtifact.findUnique({ where: { id: cleanId } });
      if (!record) {
        setPublicHeaders(reply);
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'artifact not found' } });
      }

      const artifact = await readArtifact(getArtifactsDir(), cleanId);
      if (!artifact) {
        setPublicHeaders(reply);
        return reply.code(404).send({ error: { code: 'FILE_NOT_FOUND', message: 'artifact file not found on disk' } });
      }

      setPublicHeaders(reply);
      reply.header('etag', `W/"${artifact.sha256}"`);
      reply.header('cache-control', 'public, max-age=300');
      reply.header('content-type', 'application/json');
      return reply.code(200).send(artifact);
    } catch (err: any) {
      setPublicHeaders(reply);
      return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: err.message } });
    } finally {
      await prisma.$disconnect().catch(() => {});
    }
  });

  // GET /api/certified/artifacts/:artifactId.sig — Binary signature [OKR: O1.KR2]
  app.get('/api/certified/artifacts/:artifactId.sig', { config: { public: true } }, async (req: FastifyRequest, reply: FastifyReply) => {
    const prisma = new PrismaClient();
    try {
      const { artifactId } = (req as any).params as { artifactId: string };
      const record = await prisma.publishedArtifact.findUnique({ where: { id: artifactId }, select: { signature: true } });
      if (!record) {
        setPublicHeaders(reply);
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'artifact not found' } });
      }

      setPublicHeaders(reply);
      reply.header('cache-control', 'public, max-age=300');
      reply.header('content-type', 'application/octet-stream');
      return reply.code(200).send(fromBase64(record.signature));
    } catch (err: any) {
      setPublicHeaders(reply);
      return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: err.message } });
    } finally {
      await prisma.$disconnect().catch(() => {});
    }
  });

  // POST /api/certified/verify — Verify artifact by ID or inline payload [OKR: O1.KR1, O3.KR2]
  app.post('/api/certified/verify', { config: { public: true } }, async (req: FastifyRequest, reply: FastifyReply) => {
    const prisma = new PrismaClient();
    try {
      setPublicHeaders(reply);
      const body = (req.body ?? {}) as any;

      // Mode 1: verify by artifactId
      if (typeof body.artifactId === 'string' && body.artifactId.trim() !== '') {
        const artifactId = body.artifactId.trim();
        const record = await prisma.publishedArtifact.findUnique({ where: { id: artifactId }, include: { item: true } });
        if (!record) {
          return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'artifact not found' } });
        }
        const artifact = await readArtifact(getArtifactsDir(), artifactId);
        if (!artifact) {
          return reply.code(404).send({ error: { code: 'FILE_NOT_FOUND', message: 'artifact file not found' } });
        }
        if (artifact.sha256 !== record.sha256) {
          return reply.code(200).send({ ok: false, reason: 'sha256_mismatch', details: { expected: record.sha256, got: artifact.sha256 } });
        }
        if (!record.item?.lockHash || record.item.lockHash !== artifact.lockHash) {
          return reply.code(200).send({ ok: false, reason: 'lock_mismatch', details: { expected: record.item?.lockHash, got: artifact.lockHash } });
        }
        const canonicalWithSha = canonicalize(artifact);
        const sigValid = verifySignature(Buffer.from(canonicalWithSha, 'utf8'), record.signature);
        if (!sigValid) {
          return reply.code(200).send({ ok: false, reason: 'signature_invalid' });
        }
        return reply.code(200).send({ ok: true, artifactId, sha256: artifact.sha256, lockHash: artifact.lockHash });
      }

      if (body.artifact && typeof body.signature === 'string') {
        const { sha256: providedSha, ...artifactBase } = body.artifact as any;
        const recomputedSha = sha256Hex(canonicalize(artifactBase));
        if (providedSha && providedSha !== recomputedSha) {
          return reply.code(200).send({ ok: false, reason: 'sha256_mismatch', details: { expected: providedSha, got: recomputedSha } });
        }
        const canonicalWithSha = canonicalize({ ...artifactBase, sha256: providedSha ?? recomputedSha });
        const sigValid = verifySignature(Buffer.from(canonicalWithSha, 'utf8'), body.signature);
        if (!sigValid) {
          return reply.code(200).send({ ok: false, reason: 'signature_invalid' });
        }
        return reply.code(200).send({ ok: true, sha256: providedSha ?? recomputedSha });
      }

      if (body.plan && body.lock && typeof body.lock.hash === 'string') {
        const recomputedSha = sha256Hex(canonicalize(body.plan));
        if (body.lock.hash !== recomputedSha) {
          return reply.code(200).send({ ok: false, reason: 'sha256_mismatch', details: { expected: body.lock.hash, got: recomputedSha } });
        }
        return reply.code(200).send({ ok: true, sha256: recomputedSha });
      }

      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Must provide artifactId or (artifact + signature)' } });
    } catch (err: any) {
      setPublicHeaders(reply);
      return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: err.message } });
    } finally {
      await prisma.$disconnect().catch(() => {});
    }
  });
}

export default registerCertifiedArtifactsRoutes;

