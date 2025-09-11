import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import createApp from '../src/index';

const COOKIE = 'cerply_session=test';

describe('legacy ingest wrappers', () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('ingest/parse happy path', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/ingest/parse', payload: { text: 'hello world' } });
    expect(r.statusCode).toBe(200);
    const j = r.json();
    expect(j.ok).toBe(true);
  });

  it('ingest/preview happy path', { timeout: 10000 }, async () => {
    const r = await app.inject({ method: 'POST', url: '/api/ingest/preview', headers: { 'x-preview-impl': 'v3-stub' }, payload: { text: 'Algebra basics 30 mins' } });
    expect(r.statusCode).toBe(200);
    const j = r.json();
    expect((j?.preview?.modules?.[0]?.title || '')).toContain('Preview:');
  });

  it('ingest/followup happy path', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/ingest/followup', payload: { message: 'add speaking practice', modules: [{ id: 'mod-01', title: 'Foundations' }] } });
    expect(r.statusCode).toBe(200);
    const j = r.json();
    expect(j.action).toBeDefined();
  });

  it('ingest/generate 401 without session', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/ingest/generate', payload: { modules: [{ id: 'm1', title: 'X' }] } });
    expect(r.statusCode).toBe(401);
    expect(r.headers['www-authenticate']).toMatch(/Session/);
    const j = r.json();
    expect(j.error?.code).toBe('UNAUTHORIZED');
  });

  it('ingest/generate 200 with session', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/api/ingest/generate',
      payload: { modules: [{ id: 't1', title: 'Demo' }] },
      headers: { cookie: COOKIE, 'x-generate-impl': 'v3-stub' },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as any;
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items[0]).toMatchObject({
      moduleId: 'stub-01',
      title: expect.stringContaining('Deterministic'),
    });
  });
});


