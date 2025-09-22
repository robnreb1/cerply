import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import createApp from '../src/index';

const COOKIE = 'cerply_session=test';

function isPlanShape(j: any) {
  return j && j.status === 'ok' && j.endpoint === 'certified.plan' && j.mode === 'mock' && j.enabled === true &&
    j.provenance && typeof j.provenance.planner === 'string' && Array.isArray(j.provenance.proposers) && typeof j.provenance.checker === 'string' &&
    j.plan && typeof j.plan.title === 'string' && Array.isArray(j.plan.items) && j.plan.items.length > 0 && typeof j.plan.items[0].id === 'string';
}

describe('Certified endpoints (feature-flagged stubs)', () => {
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
    const r = await app.inject({ method: 'POST', url: '/api/certified/plan' });
    expect([503]).toContain(r.statusCode);
    const j = r.json();
    expect(j?.error?.code).toBe('CERTIFIED_DISABLED');
  });

  it('returns 501 stub when enabled (default mode stub)', async () => {
    // Recreate app with flag enabled
    await app.close();
    vi.stubEnv('CERTIFIED_ENABLED', 'true');
    // Ensure stub mode
    vi.stubEnv('CERTIFIED_MODE', 'stub');
    app = await createApp();
    const r = await app.inject({ method: 'POST', url: '/api/certified/plan' });
    expect([501]).toContain(r.statusCode);
    expect(r.headers['access-control-allow-origin']).toBe('*');
    expect(String(r.headers['access-control-allow-credentials'] || '')).not.toMatch(/^true$/i);
    // EPIC #82: debug header must not be present on certified POST responses
    expect(r.headers['x-cors-certified-hook']).toBeUndefined();
    const j = r.json();
    expect(j?.status).toBe('stub');
    expect(j?.endpoint).toBe('certified.plan');
    expect(typeof j?.request_id).toBe('string');
    expect(j?.request_id.length).toBeGreaterThan(0);
    expect(j?.enabled).toBe(true);
    expect(j?.message).toMatch(/enabled but not implemented/i);
  });

  it('returns 200 mock when enabled and CERTIFIED_MODE=mock', async () => {
    await app.close();
    vi.stubEnv('CERTIFIED_ENABLED', 'true');
    vi.stubEnv('CERTIFIED_MODE', 'mock');
    app = await createApp();
    const r = await app.inject({ method: 'POST', url: '/api/certified/plan', headers: { 'content-type': 'application/json' }, payload: {} });
    expect(r.statusCode).toBe(200);
    expect(r.headers['access-control-allow-origin']).toBe('*');
    expect(String(r.headers['access-control-allow-credentials'] || '')).not.toMatch(/^true$/i);
    // EPIC #82: debug header must not be present on certified POST responses
    expect(r.headers['x-cors-certified-hook']).toBeUndefined();
    const j = r.json();
    expect(isPlanShape(j)).toBe(true);
  });

  it('returns 415 when Content-Type is not application/json', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/certified/plan', headers: { 'content-type': 'text/plain' }, payload: 'x' });
    expect(r.statusCode).toBe(415);
    const j = r.json();
    expect(j?.error?.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('OPTIONS preflight returns 204 with CORS headers', async () => {
    const r = await app.inject({ method: 'OPTIONS', url: '/api/certified/plan' });
    expect(r.statusCode).toBe(204);
    expect(r.headers['access-control-allow-origin']).toBe('*');
    expect(r.headers['access-control-allow-methods']).toMatch(/POST/);
    expect(r.headers['access-control-allow-headers']).toMatch(/authorization/i);
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