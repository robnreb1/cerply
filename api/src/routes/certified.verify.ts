import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { canonicalizePlan } from '../planner/lock';
import crypto from 'node:crypto';
import { emitAudit } from './certified.audit';

const LockZ = z.object({
  algo: z.union([z.literal('blake3'), z.literal('sha256')]),
  hash: z.string(),
  canonical_bytes: z.number().int().nonnegative().optional(),
  canonical_bytes_deprecated: z.number().int().nonnegative().optional().describe('ignored'),
});

const VerifyReqZ = z.object({
  plan: z.any(),
  lock: z.object({ algo: z.union([z.literal('blake3'), z.literal('sha256')]), hash: z.string(), canonical_bytes: z.number().int().nonnegative().optional(), canonical_bytes_deprecated: z.number().int().nonnegative().optional().optional() }),
  meta: z.object({ request_id: z.string().optional() }).optional(),
});

export async function registerCertifiedVerifyRoutes(app: FastifyInstance) {
  // CORS preflight
  app.options('/api/certified/verify', { config: { public: true } }, async (_req: FastifyRequest, reply: FastifyReply) => {
    reply
      .header('access-control-allow-origin', '*')
      .header('access-control-allow-methods', 'GET,HEAD,PUT,PATCH,POST,DELETE')
      .header('access-control-allow-headers', 'content-type, authorization');
    return reply.code(204).send();
  });

  app.post('/api/certified/verify', { config: { public: true } }, async (req: FastifyRequest, reply: FastifyReply) => {
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

    const { plan, lock, meta } = parsed.data as any;

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
