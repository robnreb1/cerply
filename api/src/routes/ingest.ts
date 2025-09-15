import { FastifyInstance } from 'fastify';
import { readSession } from './auth';

export async function registerIngestRoutes(app: FastifyInstance) {
  app.post('/api/ingest/clarify', async (req, reply) => {
    reply.header('x-api', 'ingest-clarify');
    const utterance = (req.body as any)?.utterance || '';
    return { chips: ['AQA','Edexcel','WJEC','OCR'], prompts: ['Which board?','Foundation or Higher?'], intent: { domain: /gcse/i.test(utterance) ? 'gcse' : 'general', topic: utterance } };
  });

  app.post('/api/ingest/preview', async (req, reply) => {
    reply.header('x-api', 'ingest-preview');
    const brief = (req.body as any)?.brief || 'Topic';
    const n = 3 + (brief.length % 3);
    const modules = Array.from({ length: n }, (_, i) => ({ title: `Module ${i+1}`, order: i+1 }));
    return { planId: 'plan-dev', modules, notes: 'heuristic preview' };
  });

  app.post('/api/ingest/followup', async (_req, reply) => {
    reply.header('x-api', 'ingest-followup');
    return { action: 'confirm', data: { summary: 'Applied follow-up to current plan' } };
  });

  app.post('/api/ingest/generate', async (req, reply) => {
    reply.header('x-api', 'ingest-generate');
    // Auth gate when enabled
    const gateOn = !!process.env.REQUIRE_AUTH_FOR_GENERATE && process.env.REQUIRE_AUTH_FOR_GENERATE !== '0';
    if (gateOn) {
      const sess = readSession(req);
      if (!sess) {
        reply.header('www-authenticate', 'Session');
        reply.header('x-generate-impl', 'v3-stub');
        return reply.code(401).send({ error: 'auth-required' });
      }
    }
    // (existing stubbed response)
    reply.header('x-generate-impl', 'v3-stub');
    const items = [{ moduleId: 'm1', title: 'Intro', explanation: '...', questions: { mcq: [], free: [] } }];

    // Lazy-write to generation ledger if DB bound
    try {
      const db: any = (app as any).db;
      if (db?.insert) {
        const { genLedger } = require('../db/observability'); // lazy-load to satisfy esbuild
        const model = process.env.LLM_GENERATOR_MODEL || 'gpt-4o-mini';
        const cost = 12; // cents (stub for MVP; replace when real token usage available)
        await db.insert(genLedger).values({
          itemId: (Array.isArray(items) && items[0]?.id) ? (items as any)[0].id : null,
          modelUsed: model,
          costCents: cost
        });
      }
    } catch (e) {
      // ignore ledger write errors for MVP
    }

    return {
      action: 'items',
      data: { items }
    };
  });
}