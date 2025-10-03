import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createApp } from '../src/index';

describe('CSRF double-submit guard', () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  beforeAll(async () => {
    vi.stubEnv('AUTH_ENABLED', 'true');
    vi.stubEnv('ORCH_ENABLED', 'true');
    app = await createApp();
  });
  afterAll(async () => { await app.close(); vi.unstubAllEnvs(); });

  async function createSession() {
    const r = await app.inject({ method: 'POST', url: '/api/auth/session', payload: {} });
    const body = r.json() as any;
    const setCookie = r.headers['set-cookie'] as any;
    const cookies = Array.isArray(setCookie) ? setCookie.join('; ') : String(setCookie || '');
    const sidCookie = cookies.split(',').find((c: string) => /sid=/.test(c))?.split(';')[0] || '';
    const csrfCookie = cookies.split(',').find((c: string) => /csrf=/.test(c))?.split(';')[0] || '';
    const csrf = body.csrf_token;
    return { sidCookie, csrfCookie, csrf };
  }

  it('403 without csrf header/cookie', async () => {
    const { sidCookie } = await createSession();
    const r = await app.inject({ method: 'POST', url: '/api/orchestrator/jobs', headers: { 'content-type': 'application/json', cookie: sidCookie }, payload: { goal: 'x', steps: [], limits: { maxSteps: 1, maxWallMs: 100 } } });
    expect(r.statusCode).toBe(403);
    expect(r.json().error?.code).toBe('CSRF');
  });

  it('403 with header only', async () => {
    const { sidCookie, csrf } = await createSession();
    const r = await app.inject({ method: 'POST', url: '/api/orchestrator/jobs', headers: { 'content-type': 'application/json', cookie: sidCookie, 'x-csrf-token': csrf }, payload: { goal: 'x', steps: [], limits: { maxSteps: 1, maxWallMs: 100 } } });
    expect(r.statusCode).toBe(403);
  });

  it('403 with cookie only', async () => {
    const { sidCookie, csrfCookie } = await createSession();
    const r = await app.inject({ method: 'POST', url: '/api/orchestrator/jobs', headers: { 'content-type': 'application/json', cookie: `${sidCookie}; ${csrfCookie}` }, payload: { goal: 'x', steps: [], limits: { maxSteps: 1, maxWallMs: 100 } } });
    expect(r.statusCode).toBe(403);
  });

  it('200 with both header and cookie', async () => {
    const { sidCookie, csrfCookie, csrf } = await createSession();
    const r = await app.inject({ method: 'POST', url: '/api/orchestrator/jobs', headers: { 'content-type': 'application/json', cookie: `${sidCookie}; ${csrfCookie}`, 'x-csrf-token': csrf }, payload: { goal: 'x', steps: [], limits: { maxSteps: 1, maxWallMs: 100 } } });
    expect(r.statusCode).toBe(200);
  });
});


