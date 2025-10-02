import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AnalyticsIngestZ, AnalyticsAggregateQueryZ, AnalyticsAggregateZ } from '../schemas/analytics';
import { createAnalyticsStore } from '../analytics/store';

export async function registerAnalyticsPreviewRoutes(app: FastifyInstance) {
  if (String(process.env.PREVIEW_ANALYTICS || 'false').toLowerCase() !== 'true') return;
  const store = createAnalyticsStore();

  // Early hook to ensure CORS preflight works for analytics
  app.addHook('onRequest', async (req: any, reply: any) => {
    try {
      const method = String(req?.method || '').toUpperCase();
      const url = String(req?.url || '');
      if (method === 'OPTIONS' && url.startsWith('/api/analytics/')) {
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

  // CORS preflight handled via onRequest above

  // Ingest
  app.post('/api/analytics/ingest', { config: { public: true } }, async (req: FastifyRequest, reply: FastifyReply) => {
    const ct = String((req as any).headers?.['content-type'] ?? '').toLowerCase();
    if (!ct.includes('application/json')) {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(415).send({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Expected content-type: application/json' } });
    }
    const secret = String(process.env.ANALYTICS_INGEST_SECRET || '');
    if (secret) {
      const auth = String((req as any).headers?.['authorization'] || '');
      const m = /^Bearer\s+(.+)$/i.exec(auth);
      if (!m || m[1] !== secret) {
        reply.header('access-control-allow-origin', '*');
        reply.removeHeader('access-control-allow-credentials');
        return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' } });
      }
    }
    const parsed = AnalyticsIngestZ.safeParse((req as any).body || {});
    if (!parsed.success) {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Invalid payload' } });
    }
    await store.insertMany(parsed.data.events);
    reply.header('access-control-allow-origin', '*');
    reply.removeHeader('access-control-allow-credentials');
    return reply.code(204).send();
  });

  // Aggregate
  app.get('/api/analytics/aggregate', { config: { public: true } }, async (req: FastifyRequest, reply: FastifyReply) => {
    const q = AnalyticsAggregateQueryZ.parse((req as any).query || {});
    const totals = await store.aggregate(q.from, q.to);
    const payload = { totals } as const;
    try { AnalyticsAggregateZ.parse(payload); } catch {
      reply.header('access-control-allow-origin', '*');
      reply.removeHeader('access-control-allow-credentials');
      return reply.code(500).send({ error: { code: 'INTERNAL', message: 'schema validation failed' } });
    }
    reply.header('access-control-allow-origin', '*');
    reply.removeHeader('access-control-allow-credentials');
    return reply.code(200).send(payload);
  });
}


