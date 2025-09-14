import { FastifyInstance } from 'fastify';

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

  app.post('/api/ingest/generate', async (_req, reply) => {
    // auth gate happens elsewhere; for dev we let it 401 when REQUIRE_AUTH_FOR_GENERATE=1
    reply.header('x-api', 'ingest-generate');
    return { action: 'items', data: { items: [{ moduleId: 'm1', title: 'Intro', explanation: '...', questions: { mcq: [], free: [] } }] } };
  });
}