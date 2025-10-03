import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { TaskPacketZ, JobIdZ, JobStatusZ, OrchestratorEventZ, normalizeTaskPacketInput } from '../schemas/orchestrator';
import { InMemoryEngine, resolveBackend } from '../orchestrator/engine';
import { readCookie, getSession } from '../session';
import { orchestratorSecurityPlugin } from '../plugins/security.orchestrator';

const ORCH_ENABLED = String(process.env.ORCH_ENABLED || 'false').toLowerCase() === 'true';
const ORCH_MODE = (process.env.ORCH_MODE || 'mock').toString(); // mock|live

// singleton engine for process
const engine = new InMemoryEngine({ backend: resolveBackend() });

export async function registerOrchestratorRoutes(app: FastifyInstance) {
  if (!ORCH_ENABLED) {
    app.log.info('Orchestrator disabled (set ORCH_ENABLED=true to enable)');
    return;
  }

  // Register orchestrator security plugin for CSRF protection
  console.log('Registering orchestrator security plugin...');
  try {
    await app.register(orchestratorSecurityPlugin);
    console.log('Orchestrator security plugin registered successfully');
  } catch (err) {
    console.error('Failed to register orchestrator security plugin:', err);
    // Continue without security plugin rather than failing startup
  }

  // Simple readiness probe for orchestrator prefix (useful for staging canary)
  app.get('/api/orchestrator/ping', async (_req: FastifyRequest, reply: FastifyReply) => {
    reply.header('cache-control', 'no-store');
    reply.header('access-control-allow-origin', '*');
    return reply.send({ ok: true, mode: ORCH_MODE });
  });

  // POST /api/orchestrator/jobs
  app.post('/api/orchestrator/jobs', async (req: FastifyRequest, reply: FastifyReply) => {
    // CSRF protection is handled by orchestratorSecurityPlugin

  const method = String((req as any).method || '').toUpperCase();
  if (method === 'OPTIONS') return reply.code(204).send();
  const ct = String((req.headers as any)['content-type'] || '').toLowerCase();
    if (!ct.includes('application/json')) {
      return reply.code(415).send({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'application/json required' } });
    }
    const raw = ((req as any).body) ?? {};
    const pre = normalizeTaskPacketInput(raw);
    const parsed = TaskPacketZ.safeParse(pre);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Invalid Task Packet', details: parsed.error.flatten() } });
    }
    const { job_id } = engine.create(parsed.data);
    reply.header('cache-control', 'no-store');
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
    return reply.send(body);
  });

  // Logs (preview)
  app.get('/api/orchestrator/jobs/:id/logs', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = (req.params as { id: string });
    const ok = JobIdZ.safeParse(id);
    if (!ok.success) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'bad id' } });
    const job = (engine as any).get(id);
    if (!job) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'job not found' } });
    const q = (req.query as any) || {};
    const n = Math.max(1, Math.min(200, Number(q.n ?? 50)));
    const logs = Array.isArray(job.logs) ? job.logs.slice(-n) : [];
    reply.header('cache-control', 'no-store');
    return reply.send({ job_id: id, logs });
  });

  // Cancel (idempotent)
  app.post('/api/orchestrator/jobs/:id/cancel', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = (req.params as { id: string });
    const ok = JobIdZ.safeParse(id);
    if (!ok.success) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'bad id' } });
    const job = (engine as any).get(id);
    if (!job) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'job not found' } });
    if (!job.canceled && job.status === 'running') job.canceled = true;
    reply.header('cache-control', 'no-store');
    return reply.send({ ok: true });
  });

  // GET /api/orchestrator/events?job=:id (SSE)
  app.get('/api/orchestrator/events', async (req: FastifyRequest, reply: FastifyReply) => {
    const q = (req.query as any) || {};
    const id = String(q.job || '');
    const once = (() => { const v = String(q.once ?? '').toLowerCase(); return v === '1' || v === 'true' || v === 'yes'; })();
    const ok = JobIdZ.safeParse(id);
    if (!ok.success) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'missing or invalid job id' } });

    // Hijack the response so Fastify doesn't auto-complete the request
    // and we can keep the connection open for streaming.
    try { reply.hijack(); } catch {}

    // Set SSE headers directly on the raw response
    try {
      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache');
      reply.raw.setHeader('Connection', 'keep-alive');
      reply.raw.setHeader('access-control-allow-origin', '*');
      // Disable proxy buffering if present
      reply.raw.setHeader('X-Accel-Buffering', 'no');
      (reply.raw as any).flushHeaders?.();
    } catch {}

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
    try {
      reply.raw.write(`event: ready\n`);
      reply.raw.write(`data: {"job_id":"${id}","mode":"${ORCH_MODE}"}\n\n`);
      if (once) {
        // In tests or debug, allow immediate completion so inject() can return
        try { clearInterval(heartbeat); } catch {}
        try { un(); } catch {}
        try { reply.raw.end(); } catch {}
        return;
      }
    } catch {}

    // Close handler
    req.raw.on('close', () => {
      clearInterval(heartbeat);
      try { un(); } catch {}
      try { reply.raw.end(); } catch {}
    });
  });
}

export default registerOrchestratorRoutes;


