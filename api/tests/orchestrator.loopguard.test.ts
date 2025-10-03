import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createApp } from '../src/index';

describe('Orchestrator loop guard', () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  beforeAll(async () => {
    vi.stubEnv('ORCH_ENABLED', 'true');
    app = await createApp();
  });
  afterAll(async () => { await app.close(); vi.unstubAllEnvs(); });

  it('fails when maxSteps exceeded', async () => {
    const payload = { goal: 'demo', steps: new Array(10).fill(0).map((_,i) => ({ type: 'dev.log', payload: { i } })), limits: { maxSteps: 2, maxWallMs: 2000 } };
    const r = await app.inject({ method: 'POST', url: '/api/orchestrator/jobs', headers: { 'content-type': 'application/json' }, payload });
    const { job_id } = r.json() as any;
    let status = 'queued';
    let error: string | undefined;
    const t0 = Date.now();
    while (Date.now() - t0 < 3000 && status !== 'finished' && status !== 'failed') {
      const s = await app.inject({ method: 'GET', url: `/api/orchestrator/jobs/${job_id}` });
      const j = s.json() as any; status = j.status; error = j.error;
      await new Promise(res => setTimeout(res, 30));
    }
    expect(status).toBe('failed');
    expect(error).toBe('step_budget_exceeded');
  });

  it('fails when wall clock cutoff exceeded', async () => {
    const payload = { goal: 'demo', steps: new Array(50).fill(0).map((_,i) => ({ type: 'dev.log', payload: { i } })), limits: { maxSteps: 100, maxWallMs: 10 } };
    const r = await app.inject({ method: 'POST', url: '/api/orchestrator/jobs', headers: { 'content-type': 'application/json' }, payload });
    const { job_id } = r.json() as any;
    let status = 'queued';
    let error: string | undefined;
    const t0 = Date.now();
    while (Date.now() - t0 < 3000 && status !== 'finished' && status !== 'failed') {
      const s = await app.inject({ method: 'GET', url: `/api/orchestrator/jobs/${job_id}` });
      const j = s.json() as any; status = j.status; error = j.error;
      await new Promise(res => setTimeout(res, 30));
    }
    expect(status).toBe('failed');
    expect(error).toBe('wall_clock_exceeded');
  });
});


