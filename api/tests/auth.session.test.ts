import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createApp } from '../src/index';

describe('Auth session v0', () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  beforeAll(async () => {
    vi.stubEnv('AUTH_ENABLED', 'true');
    app = await createApp();
  });
  afterAll(async () => { await app.close(); vi.unstubAllEnvs(); });

  it('OPTIONS preflight for /api/auth/session returns 204 with ACAO:*', async () => {
    const r = await app.inject({ method: 'OPTIONS', url: '/api/auth/session', headers: { origin: 'https://app.cerply.com' } });
    expect(r.statusCode).toBe(204);
    expect(r.headers['access-control-allow-origin']).toBe('*');
  });

  it('POST /api/auth/session sets sid and csrf cookies and returns payload', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/auth/session', payload: {} });
    expect(r.statusCode).toBe(200);
    const sc = String(r.headers['set-cookie'] || '');
    expect(sc).toMatch(/sid=/);
    expect(sc).toMatch(/HttpOnly/);
    expect(sc).toMatch(/SameSite=Lax/);
    const body = r.json() as any;
    expect(typeof body.session_id).toBe('string');
    expect(typeof body.csrf_token).toBe('string');
    expect(typeof body.expires_at).toBe('string');
  });

  it('GET /api/auth/session 401 without cookie', async () => {
    const r = await app.inject({ method: 'GET', url: '/api/auth/session' });
    expect(r.statusCode).toBe(401);
  });

  it('GET /api/auth/session 200 with cookie set', async () => {
    const r0 = await app.inject({ method: 'POST', url: '/api/auth/session' });
    const cookies = r0.headers['set-cookie'] as any;
    const sid = Array.isArray(cookies) ? cookies[0] : String(cookies || '');
    const r = await app.inject({ method: 'GET', url: '/api/auth/session', headers: { cookie: sid } });
    expect(r.statusCode).toBe(200);
    const j = r.json() as any;
    expect(typeof j.session_id).toBe('string');
  });

  it('DELETE clears cookies', async () => {
    const r0 = await app.inject({ method: 'POST', url: '/api/auth/session' });
    const cookies = r0.headers['set-cookie'] as any;
    const sid = Array.isArray(cookies) ? cookies[0] : String(cookies || '');
    const r = await app.inject({ method: 'DELETE', url: '/api/auth/session', headers: { cookie: sid } });
    expect(r.statusCode).toBe(200);
    const sc = String(r.headers['set-cookie'] || '');
    expect(sc).toMatch(/Max-Age=0/);
  });
});


