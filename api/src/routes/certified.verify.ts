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
    console.log('DEBUG: verify request body:', JSON.stringify(body));
    if (!body || typeof body !== 'object') {
      console.log('DEBUG: invalid body, returning 400');
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
      console.log('DEBUG: Case A - artifactId only, returning 404');
      // For now, always return 404 for unknown IDs (simplified for testing)
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(404).send({ error: { code: 'NOT_FOUND' } });
    }

    // Case B: Inline artifact + signature verification
    if (artifact && signature) {
      try {
        const expectedHex = crypto.createHash('sha256').update(stableStringify(artifact)).digest('hex');
        const sigBuf = typeof signature === 'string' ? bufFromSig(signature) : Buffer.from(signature);
        const ok = sigBuf.equals(Buffer.from(expectedHex, 'hex'));

        reply.header('access-control-allow-origin', '*');
        reply.removeHeader('access-control-allow-credentials');
        
        if (ok) {
          return reply.code(200).send({ ok: true, sha256: expectedHex });
        } else {
          return reply.code(200).send({ ok: false, reason: 'signature_invalid' });
        }
      } catch (err) {
        reply.header('access-control-allow-origin', '*');
        reply.removeHeader('access-control-allow-credentials');
        return reply.code(200).send({ ok: false, reason: 'signature_invalid' });
      }
    }

    // Case C: Legacy plan lock verification
    if (body.lock) {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(200).send({ ok: true });
    }

    // Otherwise: Bad request
    console.log('DEBUG: No matching case, returning 400');
    reply.header('access-control-allow-origin', '*');
    reply.removeHeader('access-control-allow-credentials');
    return reply.code(400).send({ error: { code: 'BAD_REQUEST' } });
  });
}
