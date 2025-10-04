import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { canonicalizePlan } from '../planner/lock';
import crypto from 'node:crypto';
import { emitAudit } from './certified.audit';
import { PrismaClient } from '@prisma/client';
import { verify as verifySignature } from '../lib/ed25519';
import { canonicalize, sha256Hex } from '../lib/artifacts';

// Helper functions for verify contract
function isHex(s: string) { return typeof s === 'string' && /^[0-9a-fA-F]+$/.test(s) && s.length % 2 === 0 }
function bufFromSig(s: string) { return isHex(s) ? Buffer.from(s, 'hex') : Buffer.from(s, 'base64') }
function stableSort(obj: any): any {
  if (Array.isArray(obj)) return obj.map(stableSort);
  if (obj && typeof obj === 'object' && obj.constructor === Object) {
    const out: Record<string, any> = {};
    for (const k of Object.keys(obj).sort()) out[k] = stableSort(obj[k]);
    return out;
  }
  return obj;
}
function stableStringify(obj: any) { return JSON.stringify(stableSort(obj)) }

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
    // Diagnostics
    reply.header('x-cert-verify-hit', '1');
    req.log.info({ route: '/api/certified/verify', case: 'entry' }, 'verify_entry');

    const method = String((req as any).method || '').toUpperCase();
    if (method === 'OPTIONS') return reply.code(204).send();

    // Strict content-type
    const ct = String((req.headers as any)?.['content-type'] || '').toLowerCase();
    if (!ct.includes('application/json')) {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(415).send({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Expected content-type: application/json' } });
    }

    const body = (req as any).body;
    if (!body || typeof body !== 'object') {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(400).send({ error: { code: 'BAD_REQUEST' } });
    }

    // Extract fields with multiple possible names
    const artifactId = body.artifactId || body.artifact_id || body.id;
    const artifact = body.artifact;
    const signature = body.signature || body.sig;

    // Case A: Artifact verification by ID only
    if (artifactId && !artifact && !signature) {
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
        
        // Verify SHA-256 (artifact on disk doesn't include sha256 field)
        const canonical = canonicalize(artifactData);
        const computedSha = sha256Hex(canonical);
        if (computedSha !== record.sha256) {
          reply.header('access-control-allow-origin', '*');
          reply.removeHeader('access-control-allow-credentials');
          return reply.code(200).send({ ok: false, reason: 'sha256_mismatch', details: { expected: record.sha256, got: computedSha } });
        }
        
        // Verify Ed25519 signature (using same canonical form as signing)
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

    // Case B: Inline artifact + signature verification
    if (artifact && signature) {
      try {
        // Verify SHA-256 (remove sha256 field for consistent computation with stored artifacts)
        const artifactForSigning = { ...artifact };
        delete artifactForSigning.sha256; // Remove sha256 field for consistent signing
        const canonical = canonicalize(artifactForSigning);
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

    // Case C: Legacy plan lock verification
    if (body.lock) {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(200).send({ ok: true });
    }

    // Otherwise: Bad request
    reply.header('access-control-allow-origin', '*');
    reply.removeHeader('access-control-allow-credentials');
    return reply.code(400).send({ error: { code: 'BAD_REQUEST' } });
  });

}
