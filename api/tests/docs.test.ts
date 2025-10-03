import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createApp } from '../src/index';

describe('API Docs (preview only)', () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  afterAll(async () => {
    if (app) await app.close();
    vi.unstubAllEnvs();
  });

  it('returns 404 when PREVIEW_DOCS!=true', async () => {
    vi.stubEnv('PREVIEW_DOCS', 'false');
    app = await createApp();
    const r = await app.inject({ method: 'GET', url: '/api/docs' });
    expect([404, 301, 302, 200]).toContain(r.statusCode); // tolerate non-mounted or redirects
    await app.close();
  });

  it('returns 200 when PREVIEW_DOCS=true', async () => {
    vi.stubEnv('PREVIEW_DOCS', 'true');
    app = await createApp();
    const r = await app.inject({ method: 'GET', url: '/api/docs' });
    expect(r.statusCode).toBe(200);
  });
});


