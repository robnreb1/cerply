import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import createApp from '../src/index';

const COOKIE = 'cerply_session=test';

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

  it('returns 501 stub when enabled', async () => {
    // Recreate app with flag enabled
    await app.close();
    vi.stubEnv('CERTIFIED_ENABLED', 'true');
    app = await createApp();
    const r = await app.inject({ method: 'POST', url: '/api/certified/plan' });
    expect([501]).toContain(r.statusCode);
    const j = r.json();
    expect(j?.error?.code).toBe('NOT_IMPLEMENTED');
    expect(j?.error?.details?.step).toBe('plan');
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