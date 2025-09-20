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
  app.post('/api/certified/plan', { config: { public: true } }, async (_req: FastifyRequest, reply: FastifyReply) => {
    if (!isEnabled()) {
      return reply.code(503).send({ error: { code: 'CERTIFIED_DISABLED', message: 'Cerply Certified is disabled' } });
    }
    return reply.code(501).send({ error: { code: 'NOT_IMPLEMENTED', message: 'Stub', details: { step: 'plan' } } });
  });

  // Alternate generator (2nd proposer)
  app.post('/api/certified/alt-generate', { config: { public: true } }, async (_req, reply) => {
    if (!isEnabled()) {
      return reply.code(503).send({ error: { code: 'CERTIFIED_DISABLED', message: 'Cerply Certified is disabled' } });
    }
    return reply.code(501).send({ error: { code: 'NOT_IMPLEMENTED', message: 'Stub', details: { step: 'alt-generate' } } });
  });

  // Critique / review
  app.post('/api/certified/review', { config: { public: true } }, async (_req, reply) => {
    if (!isEnabled()) {
      return reply.code(503).send({ error: { code: 'CERTIFIED_DISABLED', message: 'Cerply Certified is disabled' } });
    }
    return reply.code(501).send({ error: { code: 'NOT_IMPLEMENTED', message: 'Stub', details: { step: 'review' } } });
  });

  // Finalize / lock
  app.post('/api/certified/finalize', { config: { public: true } }, async (_req, reply) => {
    if (!isEnabled()) {
      return reply.code(503).send({ error: { code: 'CERTIFIED_DISABLED', message: 'Cerply Certified is disabled' } });
    }
    return reply.code(501).send({ error: { code: 'NOT_IMPLEMENTED', message: 'Stub', details: { step: 'finalize' } } });
  });
}


