import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { canonicalizePlan } from '../planner/lock';
import crypto from 'node:crypto';
import { emitAudit } from './certified.audit';
import { PrismaClient } from '@prisma/client';
import { verify as verifySignature } from '../lib/ed25519';
import { canonicalize, sha256Hex } from '../lib/artifacts';

const LockZ = z.object({
  algo: z.union([z.literal('blake3'), z.literal('sha256')]),
  hash: z.string(),
  canonical_bytes: z.number().int().nonnegative().optional(),
  canonical_bytes_deprecated: z.number().int().nonnegative().optional().describe('ignored'),
});

const VerifyReqZ = z.object({
  plan: z.any().optional(),
  lock: z.object({ algo: z.union([z.literal('blake3'), z.literal('sha256')]), hash: z.string(), canonical_bytes: z.number().int().nonnegative().optional(), canonical_bytes_deprecated: z.number().int().nonnegative().optional().optional() }).optional(),
  meta: z.object({ request_id: z.string().optional() }).optional(),
  // New fields for artifact verification [OKR: O1.KR1]
  artifactId: z.string().optional(),
  artifact: z.any().optional(),
  signature: z.string().optional(),
});

export async function registerCertifiedVerifyRoutes(app: FastifyInstance) {
  // CORS preflight now handled by shared CORS plugin; no explicit OPTIONS here

  app.post('/api/certified/verify', { config: { public: true } }, async (req: FastifyRequest, reply: FastifyReply) => {
  const method = String((req as any).method || '').toUpperCase();
  if (method === 'OPTIONS') return reply.code(204).send();
  // Strict content-type
  const ct = String((req.headers as any)?.['content-type'] || '').toLowerCase();
    if (!ct.includes('application/json')) {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(415).send({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Expected content-type: application/json' } });
    }

    // Guard payload size similar to plan route (16KB)
    try {
      const hdrLen = Number((req.headers as any)?.['content-length'] ?? '0') || 0;
      let calcLen = 0;
      try { calcLen = Buffer.byteLength(JSON.stringify((req as any).body ?? {}), 'utf8'); } catch {}
      const size = Math.max(hdrLen, calcLen);
      if (size > 16 * 1024) {
        reply.header('access-control-allow-origin', '*');
        reply.removeHeader('access-control-allow-credentials');
        return reply.code(413).send({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Body exceeds 16KB', details: { limit: 16384, size } } });
      }
    } catch {}

    const body = (req as any).body;
    const parsed = VerifyReqZ.safeParse(body);
    if (!parsed.success) {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Invalid verify payload' } });
    }

    const { plan, lock, meta, artifactId, artifact, signature } = parsed.data as any;

    // Route 1: Artifact verification by ID [OKR: O1.KR1, O3.KR2]
    if (artifactId) {
      const prisma = new PrismaClient();
      try {
        const record = await prisma.publishedArtifact.findUnique({
          where: { id: artifactId },
          include: { item: true },
        });
        if (!record) {
          reply.header('access-control-allow-origin', '*');
          reply.removeHeader('access-control-allow-credentials');
          return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'artifact not found' } });
        }
        
        // Read artifact from disk
        const { readArtifact, getArtifactsDir } = await import('../lib/artifacts');
        const artifactsDir = getArtifactsDir();
        const artifactData = await readArtifact(artifactsDir, artifactId);
        if (!artifactData) {
          reply.header('access-control-allow-origin', '*');
          reply.removeHeader('access-control-allow-credentials');
          return reply.code(404).send({ error: { code: 'FILE_NOT_FOUND', message: 'artifact file not found' } });
        }
        
        // Verify lockHash matches item
        if (!record.item.lockHash || artifactData.lockHash !== record.item.lockHash) {
          reply.header('access-control-allow-origin', '*');
          reply.removeHeader('access-control-allow-credentials');
          return reply.code(200).send({ ok: false, reason: 'lock_mismatch', details: { expected: record.item.lockHash, got: artifactData.lockHash } });
        }
        
        // Verify SHA-256
        const canonical = canonicalize(artifactData);
        const computedSha = sha256Hex(canonical);
        if (computedSha !== record.sha256) {
          reply.header('access-control-allow-origin', '*');
          reply.removeHeader('access-control-allow-credentials');
          return reply.code(200).send({ ok: false, reason: 'sha256_mismatch', details: { expected: record.sha256, got: computedSha } });
        }
        
        // Verify Ed25519 signature
        const sigValid = verifySignature(Buffer.from(canonical, 'utf8'), record.signature);
        if (!sigValid) {
          reply.header('access-control-allow-origin', '*');
          reply.removeHeader('access-control-allow-credentials');
          return reply.code(200).send({ ok: false, reason: 'signature_invalid' });
        }
        
        reply.header('access-control-allow-origin', '*');
        reply.removeHeader('access-control-allow-credentials');
        return reply.code(200).send({ ok: true, artifactId, sha256: record.sha256, lockHash: artifactData.lockHash });
      } catch (err: any) {
        reply.header('access-control-allow-origin', '*');
        reply.removeHeader('access-control-allow-credentials');
        return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: err.message } });
      } finally {
        await prisma.$disconnect();
      }
    }

    // Route 2: Artifact verification with inline artifact + signature [OKR: O1.KR1, O3.KR2]
    if (artifact && signature) {
      try {
        // Verify SHA-256
        const canonical = canonicalize(artifact);
        const computedSha = sha256Hex(canonical);
        if (artifact.sha256 && artifact.sha256 !== computedSha) {
          reply.header('access-control-allow-origin', '*');
          reply.removeHeader('access-control-allow-credentials');
          return reply.code(200).send({ ok: false, reason: 'sha256_mismatch', details: { expected: artifact.sha256, got: computedSha } });
        }
        
        // Verify Ed25519 signature
        const sigValid = verifySignature(Buffer.from(canonical, 'utf8'), signature);
        if (!sigValid) {
          reply.header('access-control-allow-origin', '*');
          reply.removeHeader('access-control-allow-credentials');
          return reply.code(200).send({ ok: false, reason: 'signature_invalid' });
        }
        
        reply.header('access-control-allow-origin', '*');
        reply.removeHeader('access-control-allow-credentials');
        return reply.code(200).send({ ok: true, sha256: computedSha });
      } catch (err: any) {
        reply.header('access-control-allow-origin', '*');
        reply.removeHeader('access-control-allow-credentials');
        return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: err.message } });
      }
    }

    // Route 3: Legacy plan lock verification (existing behavior)
    if (!plan || !lock) {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Must provide either artifactId, (artifact+signature), or (plan+lock)' } });
    }

    // Recompute canonical and hash
    const { json, bytes } = canonicalizePlan(plan);
    // Recompute using client's requested algorithm if available
    const requestedAlgo = String(lock.algo);
    let computedHash = '';
    let algoUnavailable = false;
    try {
      const h = (crypto as any).createHash(requestedAlgo);
      h.update(json);
      computedHash = h.digest('hex');
    } catch {
      algoUnavailable = true;
    }

    let ok = true;
    let mismatch: any = undefined;
    if (algoUnavailable) {
      ok = false;
      mismatch = { reason: 'algo', detail: 'unavailable' };
    } else if (lock.hash !== computedHash) {
      ok = false;
      mismatch = { reason: 'hash' };
    }

    const resp: any = {
      ok,
      computed: { algo: requestedAlgo, hash: algoUnavailable ? undefined : computedHash, size_bytes: bytes },
      provided: { algo: lock.algo, hash: lock.hash },
    };
    if (!ok && mismatch) resp.mismatch = mismatch;

    try {
      const pref = algoUnavailable ? undefined : String(computedHash).slice(0, 16);
      emitAudit({ ts: new Date().toISOString(), request_id: meta?.request_id, action: 'verify', lock_algo: requestedAlgo, lock_hash_prefix: pref, ok });
    } catch {}

    reply.header('access-control-allow-origin', '*');
    reply.removeHeader('access-control-allow-credentials');
    return reply.code(200).send(resp);
  });
}
