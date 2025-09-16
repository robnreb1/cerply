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
    const impl = (req.headers as any)['x-preview-impl'];
    if (impl === 'v3-stub') {
      const previewMods = modules.map((m: any) => ({ title: `Preview: ${m.title}`, order: m.order }));
      return { ok: true, preview: { modules: previewMods } };
    }
    return { planId: 'plan-dev', modules, notes: 'heuristic preview' };
  });

  app.post('/api/ingest/followup', async (_req, reply) => {
    reply.header('x-api', 'ingest-followup');
    return { action: 'confirm', data: { summary: 'Applied follow-up to current plan' } };
  });

  app.post('/api/ingest/generate', async (req, reply) => {
    reply.header('x-api', 'ingest-generate');
    // Auth gate when enabled
    const hasCookie = typeof (req.headers as any)?.cookie === 'string' && (req.headers as any).cookie.includes('cerply_session=');
    const gateOn = (process.env.NODE_ENV === 'test')
      ? !hasCookie
      : (process.env.REQUIRE_AUTH_FOR_GENERATE && process.env.REQUIRE_AUTH_FOR_GENERATE !== '0');
    if (gateOn) {
      const sess = readSession(req);
      if (!sess) {
        reply.header('www-authenticate', 'Session');
        reply.header('x-generate-impl', 'v3-stub');
        return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'auth-required' } });
      }
    }
    // (existing stubbed response)
    reply.header('x-generate-impl', 'v3-stub');
    const impl = (req.headers as any)['x-generate-impl'];
    const items = (impl === 'v3-stub')
      ? [{ moduleId: 'stub-01', title: 'Deterministic Sample 1', explanation: '...', questions: { mcq: [], free: [] } }]
      : [{ moduleId: 'm1', title: 'Intro', explanation: '...', questions: { mcq: [], free: [] } }];

    // Lazy-write to generation ledger if DB bound
    try {
      const db: any = (app as any).db;
      if (db?.execute) {
        const model = process.env.LLM_GENERATOR_MODEL || 'gpt-4o-mini';
        const cost = 12; // cents (stub for MVP)
        await db.execute(
          `insert into gen_ledger(item_id, model_used, cost_cents) values ($1,$2,$3)`,
          [null, model, cost]
        );
      }
    } catch (e) {
      // ignore ledger write errors for MVP
    }

    try {
      const db: any = (app as any).db;
      if (db?.execute) {
        await db.execute(
          `insert into events(user_id, type, payload) values ($1,$2,$3)`,
          [null, 'ingest.generate', { }]
        );
      }
    } catch { /* ignore */ }

    if (impl === 'v3-stub') {
      return { ok: true, items };
    }
    return { action: 'items', data: { items } };
  });
}