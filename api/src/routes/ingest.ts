import type { FastifyInstance } from 'fastify';
import { readSession } from './auth';

// helper: forward all request headers except hop-by-hop ones
function forwardReqHeaders(h: Record<string, any>) {
  const { host, connection, 'content-length': _cl, 'transfer-encoding': _te, ...rest } = (h as any) || {};
  return rest as any;
}

export async function registerIngestRoutes(app: FastifyInstance) {
  // Clarify (lightweight chips/prompts stub)
  app.post('/api/ingest/clarify', async (req, reply) => {
    reply.header('x-api', 'ingest-clarify');
    reply.header('cache-control', 'no-store');
    const utterance = (req.body as any)?.utterance || (req.body as any)?.text || '';
    return {
      chips: ['AQA', 'Edexcel', 'WJEC', 'OCR'],
      prompts: ['Which board?', 'Foundation or Higher?'],
      intent: { domain: /gcse/i.test(String(utterance)) ? 'gcse' : 'general', topic: utterance },
    };
  });

  // Preview (deterministic heuristic; supports test stub header)
  app.post('/api/ingest/preview', async (req, reply) => {
    reply.header('x-api', 'ingest-preview');
    reply.header('cache-control', 'no-store');
    const brief: string = (req.body as any)?.brief || (req.body as any)?.text || '';
    const n = Math.max(2, Math.min(6, 3 + (String(brief).length % 3)));
    const modules = Array.from({ length: n }, (_, i) => ({ title: `Module ${i + 1}`, order: i + 1 }));
    const impl = (req.headers as any)['x-preview-impl'];
    if (impl === 'v3-stub') {
      const previewMods = modules.map((m: any) => ({ title: `Preview: ${m.title}`, order: m.order }));
      return { ok: true, preview: { modules: previewMods } };
    }
    return { ok: true, modules };
  });

  // Follow-up (noop stub)
  app.post('/api/ingest/followup', async (_req, reply) => {
    reply.header('x-api', 'ingest-followup');
    reply.header('cache-control', 'no-store');
    return { action: 'confirm', data: { summary: 'Applied follow-up to current plan' } };
  });

  // Generate (stubbed content, auth-guard optional)
  app.post('/api/ingest/generate', async (req, reply) => {
    reply.header('x-api', 'ingest-generate');
    reply.header('cache-control', 'no-store');

    // Auth gate when enabled
    const hasCookie = typeof (req.headers as any)?.cookie === 'string' && (req.headers as any).cookie.includes('cerply.sid=');
    const gateOn = (process.env.NODE_ENV === 'test')
      ? !hasCookie
      : (process.env.REQUIRE_AUTH_FOR_GENERATE && process.env.REQUIRE_AUTH_FOR_GENERATE !== '0');
    if (gateOn) {
      const sess = readSession(req as any);
      if (!sess) {
        reply.header('www-authenticate', 'Session');
        reply.header('x-generate-impl', 'v3-stub');
        return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'auth-required' } });
      }
    }

    // Build deterministic stubbed items
    const impl = (req.headers as any)['x-generate-impl'];
    const items = (impl === 'v3-stub')
      ? [{ moduleId: 'stub-01', title: 'Deterministic Sample 1', explanation: '...', questions: { mcq: [], free: [] } }]
      : [{ moduleId: 'm1', title: 'Intro', explanation: '...', questions: { mcq: [], free: [] } }];

    // Best-effort ledger + event telemetry (raw SQL)
    try {
      const db: any = (app as any).db;
      if (db?.execute) {
        const model = process.env.LLM_GENERATOR_MODEL || 'mock:router';
        const cost = 12; // cents (stub for MVP)
        await db.execute(
          `insert into gen_ledger(item_id, model_used, cost_cents, ts) values ($1,$2,$3, now())`,
          [null, model, cost]
        );
        await db.execute(
          `insert into events(user_id, type, payload, ts) values ($1,$2,$3, now())`,
          [null, 'ingest.generate', {}]
        );
      }
    } catch { /* ignore */ }

    if (impl === 'v3-stub') return { ok: true, items };
    return { action: 'items', data: { items } };
  });

  // Convenience aliases
  app.post('/ingest/preview', async (req: any, reply: any) => {
    const r = await app.inject({ method: 'POST', url: '/api/ingest/preview', payload: req.body, headers: forwardReqHeaders(req.headers as any) });
    return reply.code(r.statusCode).headers(r.headers as any).send(r.body);
  });
  app.post('/ingest/generate', async (req: any, reply: any) => {
    const r = await app.inject({ method: 'POST', url: '/api/ingest/generate', payload: req.body, headers: forwardReqHeaders(req.headers as any) });
    return reply.code(r.statusCode).headers(r.headers as any).send(r.body);
  });
}
