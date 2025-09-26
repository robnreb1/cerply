import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import createApp from '../src/index';

describe('Orchestrator CORS/Security', () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  beforeAll(async () => {
    vi.stubEnv('ORCH_ENABLED', 'true');
    app = await createApp();
  });
  afterAll(async () => { await app.close(); vi.unstubAllEnvs(); });

  it('OPTIONS preflight returns 204 with ACAO:*', async () => {
    const r = await app.inject({ method: 'OPTIONS', url: '/api/orchestrator/jobs', headers: { origin: 'https://app.cerply.com', 'access-control-request-method': 'POST' } });
    expect(r.statusCode).toBe(204);
    expect(r.headers['access-control-allow-origin']).toBe('*');
  });

  it('POST returns ACAO:* and no ACAC:true or debug header', async () => {
    const body = { goal: 'x', steps: [], limits: { maxSteps: 1, maxWallMs: 50 } };
    const r = await app.inject({ method: 'POST', url: '/api/orchestrator/jobs', headers: { 'content-type': 'application/json' }, payload: body });
    expect(r.statusCode).toBe(200);
    expect(r.headers['access-control-allow-origin']).toBe('*');
    expect(r.headers['access-control-allow-credentials']).toBeUndefined();
    expect(r.headers['x-cors-certified-hook']).toBeUndefined();
  });
});


