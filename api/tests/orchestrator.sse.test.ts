import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createApp } from '../src/index';

describe('Orchestrator SSE', () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  beforeAll(async () => {
    vi.stubEnv('ORCH_ENABLED', 'true');
    app = await createApp();
  });
  afterAll(async () => { await app.close(); vi.unstubAllEnvs(); });

  it('streams events for a running job', async () => {
    const payload = { goal: 'demo', steps: [{ type: 'dev.log', payload: { hello: 'world' } }], limits: { maxSteps: 3, maxWallMs: 2000 } };
    const r = await app.inject({ method: 'POST', url: '/api/orchestrator/jobs', headers: { 'content-type': 'application/json' }, payload });
    const { job_id } = r.json() as any;
    const s = await app.inject({ method: 'GET', url: `/api/orchestrator/events?job=${encodeURIComponent(job_id)}&once=1` });
    expect(s.statusCode).toBe(200);
    const body = s.body.toString();
    expect(body.includes('event: ready')).toBe(true);
  });
});


