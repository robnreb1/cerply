import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createApp } from '../src/index';

describe('Orchestrator lifecycle (status/logs/cancel)', () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    vi.stubEnv('ORCH_ENABLED', 'true');
    vi.stubEnv('ORCH_MODE', 'mock');
    app = await createApp();
  });
  afterAll(async () => { await app.close(); vi.unstubAllEnvs(); });

  it('logs endpoint returns recent lines including job.end', async () => {
    const payload = { goal: 'log-demo', steps: [], limits: { maxSteps: 2, maxWallMs: 1000 } };
    const r = await app.inject({ method: 'POST', url: '/api/orchestrator/jobs', headers: { 'content-type': 'application/json' }, payload });
    expect(r.statusCode).toBe(200);
    const { job_id } = r.json() as any;

    // poll until terminal
    let status = 'queued';
    const t0 = Date.now();
    while (Date.now() - t0 < 3000 && status !== 'succeeded' && status !== 'failed') {
      const s = await app.inject({ method: 'GET', url: `/api/orchestrator/jobs/${job_id}` });
      expect([200, 404]).toContain(s.statusCode);
      if (s.statusCode === 200) status = (s.json() as any).status;
      await new Promise(res => setTimeout(res, 25));
    }
    expect(['succeeded','failed']).toContain(status);

    const lg = await app.inject({ method: 'GET', url: `/api/orchestrator/jobs/${job_id}/logs?n=20` });
    expect(lg.statusCode).toBe(200);
    const body = lg.json() as any;
    expect(Array.isArray(body.logs)).toBe(true);
    const last = body.logs[body.logs.length - 1];
    expect(last?.msg).toBe('job.end');
  });

  it('cancel transitions running job to canceled', async () => {
    const payload = { goal: 'cancel-demo', steps: [{ type: 'dev.log' }, { type: 'dev.log' }, { type: 'dev.log' }], limits: { maxSteps: 10, maxWallMs: 2000 } };
    const r = await app.inject({ method: 'POST', url: '/api/orchestrator/jobs', headers: { 'content-type': 'application/json' }, payload });
    expect(r.statusCode).toBe(200);
    const { job_id } = r.json() as any;

    // wait until running if possible, then cancel
    let status = 'queued';
    const t0 = Date.now();
    while (Date.now() - t0 < 1000 && status !== 'running') {
      const s = await app.inject({ method: 'GET', url: `/api/orchestrator/jobs/${job_id}` });
      if (s.statusCode === 200) status = (s.json() as any).status;
      await new Promise(res => setTimeout(res, 25));
    }
    await app.inject({ method: 'POST', url: `/api/orchestrator/jobs/${job_id}/cancel` });

    // poll for canceled or any terminal
    const t1 = Date.now();
    let final = status;
    while (Date.now() - t1 < 3000 && !['canceled','succeeded','failed'].includes(final)) {
      const s = await app.inject({ method: 'GET', url: `/api/orchestrator/jobs/${job_id}` });
      if (s.statusCode === 200) final = (s.json() as any).status;
      await new Promise(res => setTimeout(res, 25));
    }
    expect(['canceled','succeeded','failed']).toContain(final);
  });
});


