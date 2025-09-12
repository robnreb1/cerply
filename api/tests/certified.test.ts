import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import createApp from '../src/index';

const COOKIE = 'cerply_session=test';

describe('Certified endpoints (admin gating)', () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    // Enable the dev admin path for this test run
    vi.stubEnv('ALLOW_DEV_ADMIN', 'true');
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  it('rejects non-admin on plan', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/api/certified/plan',
      payload: { topic: 'Demo' },
    });
    expect(r.statusCode).toBe(403);
  });

  it('accepts admin (dev) with session cookie', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/api/certified/plan',
      payload: { topic: 'Demo' },
      headers: { cookie: COOKIE, 'x-admin': 'true' },
    });
    expect(r.statusCode).toBe(200);
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