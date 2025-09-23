import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'node:crypto';
import { PlanRequestZ, PlanResponseZ } from '../schemas/certified.plan';
import { PlannerInputZ } from '../planner/interfaces';
import { MockPlanner } from '../planner/engines/mock';

// Extend Fastify route config to accept a `public` boolean used by global guards
declare module 'fastify' {
  interface FastifyContextConfig {
    public?: boolean;
  }
}

function isEnabled() {
  return String(process.env.CERTIFIED_ENABLED ?? 'false').toLowerCase() === 'true';
}

export function registerCertifiedRoutes(app: FastifyInstance) {
  // Early hook to ensure CORS preflight works even if path matching varies
  app.addHook('onRequest', async (req: any, reply: any) => {
    try {
      const method = String(req?.method || '').toUpperCase();
      const url = String(req?.url || '');
      if (method === 'OPTIONS' && url.startsWith('/api/certified/')) {
        reply
          .header('access-control-allow-origin', '*')
          .header('access-control-allow-methods', 'GET,HEAD,PUT,PATCH,POST,DELETE')
          .header('access-control-allow-headers', 'content-type, authorization')
          .code(204)
          .send();
        return reply;
      }
    } catch {}
  });
  // Enforce CORS invariants on all certified responses (non-OPTIONS)
  app.addHook('onSend', async (req: any, reply: any, payload: any) => {
    try {
      const method = String(req?.method || '').toUpperCase();
      const url = String(req?.url || '');
      if (url.startsWith('/api/certified/') && method !== 'OPTIONS') {
        reply.header('access-control-allow-origin', '*');
        reply.removeHeader('access-control-allow-credentials');
        reply.removeHeader('x-cors-certified-hook');
      }
    } catch {}
    return payload;
  });
  // CORS preflight for certified endpoints
  app.options('/api/certified/*', { config: { public: true } }, async (req: FastifyRequest, reply: FastifyReply) => {
    reply
      .header('access-control-allow-origin', '*')
      .header('access-control-allow-methods', 'GET,HEAD,PUT,PATCH,POST,DELETE')
      .header('access-control-allow-headers', 'content-type, authorization');
    return reply.code(204).send();
  });

  // Plan
  /**
   * Certified Plan schema (mock) — from docs/spec/flags.md Runtime (mode)
   *
   * {
   *   "status":"ok",
   *   "request_id":"<uuid>",
   *   "endpoint":"certified.plan",
   *   "mode":"mock",
   *   "enabled": true,
   *   "provenance": { "planner":"mock", "proposers":["mockA","mockB"], "checker":"mock" },
   *   "plan": { "title":"Mock Plan", "items":[ { "id":"m1", "type":"card", "front":"...", "back":"..." } ] }
   * }
   */
  app.post('/api/certified/plan', { config: { public: true } }, async (_req: FastifyRequest, reply: FastifyReply) => {
    // Enforce content-type for POSTs (DoD: return 415 on wrong/missing Content-Type)
    const ct = String(((_req as any).headers?.['content-type'] ?? '')).toLowerCase();
    if (!ct.includes('application/json')) {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(415).send({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Expected content-type: application/json' } });
    }
    if (!isEnabled()) {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(503).send({ error: { code: 'CERTIFIED_DISABLED', message: 'Cerply Certified is disabled' } });
    }
    const request_id = crypto.randomUUID();
    const method = (_req as any).method || 'POST';
    const path = (_req as any).url || '/api/certified/plan';
    const ua = String((_req as any).headers?.['user-agent'] ?? '');
    const ip = String(((_req as any).headers?.['x-forwarded-for'] ?? '').toString().split(',')[0].trim() || (_req as any).ip || '');
    const ip_hash = crypto.createHash('sha256').update(ip).digest('hex');

    const MODE = String(process.env.CERTIFIED_MODE ?? 'stub').toLowerCase();
    if (MODE === 'plan') {
      // Validate body shape strictly
      const parsed = PlannerInputZ.safeParse(((_req as any).body ?? {}) as any);
      if (!parsed.success) {
        return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Missing required field: topic (non-empty string)' } });
      }
      const input = parsed.data;
      const engine = (process.env.PLANNER_ENGINE || 'mock').toLowerCase();
      const planner = MockPlanner; // default and CI-safe
      const out = await planner.generate(input);

      try { app.log.info({ request_id, method, path, ua, ip_hash, mode: MODE }, 'certified_plan_planmode'); } catch {}
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      const payload = {
        status: 'ok',
        request_id,
        endpoint: 'certified.plan',
        mode: 'plan',
        enabled: true,
        provenance: out.provenance,
        plan: out.plan
      } as const;
      // Runtime response validation (guardrail)
      try { PlanResponseZ.parse(payload); } catch { return reply.code(500).send({ error: { code: 'INTERNAL', message: 'schema validation failed' } }); }
      return reply.code(200).send(payload);
    }

    if (MODE === 'mock') {
      try { app.log.info({ request_id, method, path, ua, ip_hash, mode: MODE }, 'certified_plan_mock'); } catch {}
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(200).send({
        status: 'ok',
        request_id,
        endpoint: 'certified.plan',
        mode: 'mock',
        enabled: true,
        provenance: { planner: 'mock', proposers: ['mockA','mockB'], checker: 'mock' },
        plan: { title: 'Mock Plan', items: [{ id: 'm1', type: 'card', front: '...', back: '...' }] }
      });
    }

    try { app.log.info({ request_id, method, path, ua, ip_hash, mode: MODE }, 'certified_plan_stubbed'); } catch {}
    reply.header('access-control-allow-origin', '*');
    reply.removeHeader('access-control-allow-credentials');
    return reply.code(501).send({
      status: 'stub',
      endpoint: 'certified.plan',
      request_id,
      enabled: true,
      message: 'Certified pipeline is enabled but not implemented yet.'
    });
  });

  // Alternate generator (2nd proposer)
  app.post('/api/certified/alt-generate', { config: { public: true } }, async (_req, reply) => {
    if (!isEnabled()) {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(503).send({ error: { code: 'CERTIFIED_DISABLED', message: 'Cerply Certified is disabled' } });
    }
    reply.header('access-control-allow-origin', '*');
    reply.removeHeader('access-control-allow-credentials');
    return reply.code(501).send({ error: { code: 'NOT_IMPLEMENTED', message: 'Stub', details: { step: 'alt-generate' } } });
  });

  // Critique / review
  app.post('/api/certified/review', { config: { public: true } }, async (_req, reply) => {
    if (!isEnabled()) {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(503).send({ error: { code: 'CERTIFIED_DISABLED', message: 'Cerply Certified is disabled' } });
    }
    reply.header('access-control-allow-origin', '*');
    reply.removeHeader('access-control-allow-credentials');
    return reply.code(501).send({ error: { code: 'NOT_IMPLEMENTED', message: 'Stub', details: { step: 'review' } } });
  });

  // Finalize / lock
  app.post('/api/certified/finalize', { config: { public: true } }, async (_req, reply) => {
    if (!isEnabled()) {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(503).send({ error: { code: 'CERTIFIED_DISABLED', message: 'Cerply Certified is disabled' } });
    }
    reply.header('access-control-allow-origin', '*');
    reply.removeHeader('access-control-allow-credentials');
    return reply.code(501).send({ error: { code: 'NOT_IMPLEMENTED', message: 'Stub', details: { step: 'finalize' } } });
  });
}


