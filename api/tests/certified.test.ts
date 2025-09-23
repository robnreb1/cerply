import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import createApp from '../src/index';

const COOKIE = 'cerply_session=test';

describe('Certified endpoints (feature-flagged stubs + mock)', () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    // Default disabled
    vi.stubEnv('CERTIFIED_ENABLED', 'false');
    // Keep dev admin path for other tests
    vi.stubEnv('ALLOW_DEV_ADMIN', 'true');
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  it('returns 503 when disabled', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/certified/plan', headers: { 'content-type': 'application/json' }, payload: {} });
    expect([503]).toContain(r.statusCode);
  });

  it('returns 501 stub when enabled (default stub mode)', async () => {
    // Recreate app with flag enabled
    await app.close();
    vi.stubEnv('CERTIFIED_ENABLED', 'true');
    app = await createApp();
    const r = await app.inject({ method: 'POST', url: '/api/certified/plan', headers: { 'content-type': 'application/json' }, payload: {} });
    expect([501]).toContain(r.statusCode);
  });

  it('returns 415 when missing/wrong content-type', async () => {
    await app.close();
    vi.stubEnv('CERTIFIED_ENABLED', 'true');
    vi.stubEnv('CERTIFIED_MODE', 'mock');
    app = await createApp();
    const r = await app.inject({ method: 'POST', url: '/api/certified/plan' });
    expect(r.statusCode).toBe(415);
  });

  it('returns 200 mock shape when enabled and CERTIFIED_MODE=mock', async () => {
    await app.close();
    vi.stubEnv('CERTIFIED_ENABLED', 'true');
    vi.stubEnv('CERTIFIED_MODE', 'mock');
    app = await createApp();
    const r = await app.inject({ method: 'POST', url: '/api/certified/plan', headers: { 'content-type': 'application/json' }, payload: {} });
    expect(r.statusCode).toBe(200);
    const j = r.json() as any;
    expect(j.status).toBe('ok');
    expect(j.endpoint).toBe('certified.plan');
    expect(j.mode).toBe('mock');
    expect(j.enabled).toBe(true);
    expect(typeof j.request_id).toBe('string');
    expect(j.provenance?.planner).toBe('mock');
    expect(Array.isArray(j.provenance?.proposers)).toBe(true);
    expect(j.provenance?.checker).toBe('mock');
    expect(j.plan?.title).toBe('Mock Plan');
    expect(Array.isArray(j.plan?.items)).toBe(true);
    expect(j.plan.items.length).toBeGreaterThan(0);
  });

  it('OPTIONS preflight returns 204 with ACAO:*', async () => {
    await app.close();
    vi.stubEnv('CERTIFIED_ENABLED', 'true');
    app = await createApp();
    const r = await app.inject({ method: 'OPTIONS', url: '/api/certified/plan' });
    expect(r.statusCode).toBe(204);
    const acao = r.headers['access-control-allow-origin'];
    expect(acao).toBe('*');
  });

  it('expert module approve requires admin', async () => {
    // Create an expert module (needs a session)
    const mk = await app.inject({
      method: 'POST',
      url: '/api/expert/modules',
      headers: { cookie: COOKIE },
      payload: { title: 'X' },
    });
    expect(mk.statusCode).toBe(200);
    const { id } = mk.json() as any;
    expect(id).toBeTruthy();

    // Without admin should be forbidden
    const noAdmin = await app.inject({
      method: 'PATCH',
      url: `/api/expert/modules/${id}/approve`,
    });
    expect(noAdmin.statusCode).toBe(403);

    // With admin should succeed
    const ok = await app.inject({
      method: 'PATCH',
      url: `/api/expert/modules/${id}/approve`,
      headers: { cookie: COOKIE, 'x-admin': 'true' },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({ ok: true, id, status: 'approved' });
  });
});