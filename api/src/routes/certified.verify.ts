import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { canonicalizePlan, computeLock } from '../planner/lock';

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

    const body = (req as any).body;
    const parsed = VerifyReqZ.safeParse(body);
    if (!parsed.success) {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Invalid verify payload' } });
    }

    const { plan, lock } = parsed.data as any;

    // Recompute canonical and hash
    const { json, bytes } = canonicalizePlan(plan);
    const computed = computeLock(plan);

    let ok = true;
    let mismatch: any = undefined;
    if (lock.algo !== computed.algo) {
      ok = false;
      mismatch = { reason: 'algo' };
    } else if (lock.hash !== computed.hash) {
      ok = false;
      mismatch = { reason: 'hash' };
    }

    const resp: any = {
      ok,
      computed: { algo: computed.algo, hash: computed.hash, size_bytes: bytes },
      provided: { algo: lock.algo, hash: lock.hash },
    };
    if (!ok && mismatch) resp.mismatch = mismatch;

    reply.header('access-control-allow-origin', '*');
    reply.removeHeader('access-control-allow-credentials');
    return reply.code(200).send(resp);
  });
}
