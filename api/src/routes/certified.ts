import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

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
  // Plan
  app.post('/api/certified/plan', { config: { public: true } }, async (req: FastifyRequest, reply: FastifyReply) => {
    const code = isEnabled() ? 503 : 501; // 503 when feature enabled but not wired; 501 when disabled
    return reply.code(code).send({ status: 'stub', ok: false, route: 'plan' });
  });

  // Alternate generator (2nd proposer)
  app.post('/api/certified/alt-generate', { config: { public: true } }, async (_req, reply) => {
    const code = isEnabled() ? 503 : 501;
    return reply.code(code).send({ status: 'stub', ok: false, route: 'alt-generate' });
  });

  // Critique / review
  app.post('/api/certified/review', { config: { public: true } }, async (_req, reply) => {
    const code = isEnabled() ? 503 : 501;
    return reply.code(code).send({ status: 'stub', ok: false, route: 'review' });
  });

  // Finalize / lock
  app.post('/api/certified/finalize', { config: { public: true } }, async (_req, reply) => {
    const code = isEnabled() ? 503 : 501;
    return reply.code(code).send({ status: 'stub', ok: false, route: 'finalize' });
  });
}


