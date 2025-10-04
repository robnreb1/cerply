import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createApp } from '../src/index';

describe('Orchestrator soft auth guard', () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  beforeAll(async () => {
    vi.stubEnv('ORCH_ENABLED', 'true');
    vi.stubEnv('AUTH_ENABLED', 'true');
    vi.stubEnv('AUTH_REQUIRE_SESSION', 'true');
    app = await createApp();
  });
  afterAll(async () => { await app.close(); vi.unstubAllEnvs(); });

  it('401 on POST without session when required', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/orchestrator/jobs', headers: { 'content-type': 'application/json' }, payload: { goal: 'x', steps: [], limits: { maxSteps: 1, maxWallMs: 10 } } });
    expect([401,403]).toContain(r.statusCode);
  });

  it('200 when session and CSRF present', async () => {
    const s = await app.inject({ method: 'POST', url: '/api/auth/session', payload: {} });
    const body = s.json() as any;
    const setCookie = s.headers['set-cookie'] as any;
    const cookies = Array.isArray(setCookie) ? setCookie.join(',') : String(setCookie || '');
    const sid = cookies.split(',').find((c: string) => /sid=/.test(c))?.split(';')[0] || '';
    const csrfCookie = cookies.split(',').find((c: string) => /csrf=/.test(c))?.split(';')[0] || '';
    const csrf = body.csrf_token;
    const r = await app.inject({ method: 'POST', url: '/api/orchestrator/jobs', headers: { 'content-type': 'application/json', cookie: `${sid}; ${csrfCookie}`, 'x-csrf-token': csrf }, payload: { goal: 'ok', steps: [], limits: { maxSteps: 1, maxWallMs: 50 } } });
    expect(r.statusCode).toBe(200);
  });
});


