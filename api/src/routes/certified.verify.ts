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
    console.log('DEBUG: verify handler called');
    
    // Always return 404 for testing
    reply.header('access-control-allow-origin', '*');
    reply.removeHeader('access-control-allow-credentials');
    return reply.code(404).send({ error: { code: 'NOT_FOUND' } });
  });
}
