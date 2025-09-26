import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { TaskPacketZ, JobIdZ, JobStatusZ, OrchestratorEventZ } from '../schemas/orchestrator';
import { InMemoryEngine, resolveBackend } from '../orchestrator/engine';

const ORCH_ENABLED = String(process.env.ORCH_ENABLED || 'false').toLowerCase() === 'true';
const ORCH_MODE = (process.env.ORCH_MODE || 'mock').toString(); // mock|live

// singleton engine for process
const engine = new InMemoryEngine({ backend: resolveBackend() });

export async function registerOrchestratorRoutes(app: FastifyInstance) {
  if (!ORCH_ENABLED) {
    app.log.info('Orchestrator disabled (set ORCH_ENABLED=true to enable)');
    return;
  }

  // POST /api/orchestrator/jobs
  app.post('/api/orchestrator/jobs', async (req: FastifyRequest, reply: FastifyReply) => {
    const ct = String((req.headers as any)['content-type'] || '').toLowerCase();
    if (!ct.includes('application/json')) {
      reply.header('access-control-allow-origin', '*');
      return reply.code(415).send({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'application/json required' } });
    }
    const parsed = TaskPacketZ.safeParse(((req as any).body) ?? {});
    if (!parsed.success) {
      reply.header('access-control-allow-origin', '*');
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Invalid Task Packet', details: parsed.error.flatten() } });
    }
    const { job_id } = engine.create(parsed.data);
    reply.header('cache-control', 'no-store');
    reply.header('access-control-allow-origin', '*');
    return reply.send({ job_id });
  });

  // GET /api/orchestrator/jobs/:id
  app.get('/api/orchestrator/jobs/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = (req.params as { id: string });
    const ok = JobIdZ.safeParse(id);
    if (!ok.success) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'bad id' } });
    const job = (engine as any).get(id);
    if (!job) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'job not found' } });
    const body = {
      job_id: job.id,
      status: job.status,
      started_at: job.startedAt ? new Date(job.startedAt).toISOString() : undefined,
      finished_at: job.finishedAt ? new Date(job.finishedAt).toISOString() : undefined,
      error: job.error,
      stepsRun: job.stepsRun,
    };
    const parsed = JobStatusZ.safeParse(body);
    if (!parsed.success) app.log.warn({ err: parsed.error }, 'job status schema mismatch');
    reply.header('cache-control', 'no-store');
    reply.header('access-control-allow-origin', '*');
    return reply.send(body);
  });

  // GET /api/orchestrator/events?job=:id (SSE)
  app.get('/api/orchestrator/events', async (req: FastifyRequest, reply: FastifyReply) => {
    const q = (req.query as any) || {};
    const id = String(q.job || '');
    const ok = JobIdZ.safeParse(id);
    if (!ok.success) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'missing or invalid job id' } });

    reply.header('Content-Type', 'text/event-stream');
    reply.header('Cache-Control', 'no-cache');
    reply.header('Connection', 'keep-alive');
    reply.header('access-control-allow-origin', '*');

    const un = (engine as any).on(id, (ev: any) => {
      const out = OrchestratorEventZ.safeParse(ev);
      const payload = out.success ? out.data : { job_id: id, t: new Date().toISOString(), type: 'event', data: ev };
      reply.raw.write(`event: ${payload.type}\n`);
      reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    });

    // Heartbeat
    const heartbeat = setInterval(() => {
      try { reply.raw.write(': ping\n\n'); } catch {}
    }, 15000);

    // Initial announce
    try { reply.raw.write(`event: ready\n`); reply.raw.write(`data: {"job_id":"${id}","mode":"${ORCH_MODE}"}\n\n`); } catch {}

    // Close handler
    req.raw.on('close', () => { clearInterval(heartbeat); try { un(); } catch {}; });
  });
}

export default registerOrchestratorRoutes;


