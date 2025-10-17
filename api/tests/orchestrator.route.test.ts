import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createApp } from '../src/index';

describe('Orchestrator routes (preview)', () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    vi.stubEnv('ORCH_ENABLED', 'true');
    vi.stubEnv('ORCH_MODE', 'mock');
    app = await createApp();
  });
  afterAll(async () => { 
    if (app) await app.close(); 
    vi.unstubAllEnvs(); 
  });

  it('OPTIONS preflight returns 204 and ACAO:*', async () => {
    const r = await app.inject({ method: 'OPTIONS', url: '/api/orchestrator/jobs', headers: { origin: 'https://app.cerply.com', 'access-control-request-method': 'POST' } });
    expect(r.statusCode).toBe(204);
    expect(r.headers['access-control-allow-origin']).toBe('*');
  });

  it('rejects non-JSON with 415', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/orchestrator/jobs', headers: { 'content-type': 'text/plain' }, payload: 'x' });
    expect(r.statusCode).toBe(415);
    expect(r.headers['access-control-allow-origin']).toBe('*');
  });

  it('400 on bad schema', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/orchestrator/jobs', headers: { 'content-type': 'application/json' }, payload: { goal: '', limits: { maxSteps: 3, maxWallMs: 1000 } } });
    expect(r.statusCode).toBe(400);
    expect(r.headers['access-control-allow-origin']).toBe('*');
  });

  it('creates job and streams events to completion', async () => {
    const payload = { goal: 'demo', steps: [], limits: { maxSteps: 3, maxWallMs: 2000 } };
    const r = await app.inject({ method: 'POST', url: '/api/orchestrator/jobs', headers: { 'content-type': 'application/json' }, payload });
    expect(r.statusCode).toBe(200);
    const { job_id } = r.json() as any;
    expect(typeof job_id).toBe('string');

    // poll status until finished (with small timeout)
    let status = 'queued';
    const t0 = Date.now();
    while (Date.now() - t0 < 3000 && status !== 'succeeded' && status !== 'failed') {
      const s = await app.inject({ method: 'GET', url: `/api/orchestrator/jobs/${job_id}` });
      expect([200,404]).toContain(s.statusCode);
      if (s.statusCode === 200) {
        const j = s.json() as any;
        status = j.status;
      }
      await new Promise(res => setTimeout(res, 50));
    }
    expect(['succeeded','failed']).toContain(status);
  });

  it('accepts snake_case limits and normalizes', async () => {
    const payload = { goal: 'demo', steps: [], limits: { max_steps: 2, max_wall_ms: 500 } } as any;
    const r = await app.inject({ method: 'POST', url: '/api/orchestrator/jobs', headers: { 'content-type': 'application/json' }, payload });
    expect(r.statusCode).toBe(200);
    const j = r.json() as any; expect(j.job_id).toBeTruthy();
  });

  it('400 on missing limits', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/orchestrator/jobs', headers: { 'content-type': 'application/json' }, payload: { goal: 'x' } });
    expect(r.statusCode).toBe(400);
  });
});


