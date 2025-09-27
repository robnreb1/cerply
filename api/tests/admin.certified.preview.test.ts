import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import createApp from '../src/index';

describe('Admin Certified (preview) API', () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    vi.stubEnv('ADMIN_PREVIEW', 'true');
    vi.stubEnv('ADMIN_TOKEN', 'secret');
    vi.stubEnv('ADMIN_MAX_REQUEST_BYTES', String(32 * 1024));
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  it('OPTIONS preflight returns 204 with ACAO:* and allow headers include x-admin-token', async () => {
    const r = await app.inject({ method: 'OPTIONS', url: '/api/admin/certified/items/ingest', headers: { 'access-control-request-headers': 'content-type, x-admin-token' } });
    expect(r.statusCode).toBe(204);
    expect(r.headers['access-control-allow-origin']).toBe('*');
    const allowHeaders = String(r.headers['access-control-allow-headers'] || '').toLowerCase();
    expect(allowHeaders).toContain('x-admin-token');
    expect(r.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('rejects without token', async () => {
    const r = await app.inject({ method: 'GET', url: '/api/admin/certified/items' });
    expect(r.statusCode).toBe(401);
    expect(r.headers['access-control-allow-origin']).toBe('*');
  });

  it('creates source and ingests item, then approves, with ACAO:* and no ACAC', async () => {
    const hdr = { 'x-admin-token': 'secret', 'content-type': 'application/json' } as const;
    const s = await app.inject({ method: 'POST', url: '/api/admin/certified/sources', headers: hdr, payload: { name: 'Docs', baseUrl: 'https://example.com', notes: 'seed' } });
    expect(s.statusCode).toBe(200);
    expect(s.headers['access-control-allow-origin']).toBe('*');
    expect(s.headers['access-control-allow-credentials']).toBeUndefined();
    const source_id = s.json().source_id;
    expect(typeof source_id).toBe('string');

    const i = await app.inject({ method: 'POST', url: '/api/admin/certified/items/ingest', headers: hdr, payload: { title: 'Spec', url: 'https://example.com', tags: ['demo'] } });
    expect(i.statusCode).toBe(200);
    expect(i.headers['access-control-allow-origin']).toBe('*');
    expect(i.headers['access-control-allow-credentials']).toBeUndefined();
    const item_id = i.json().item_id;
    expect(typeof item_id).toBe('string');

    const list = await app.inject({ method: 'GET', url: '/api/admin/certified/items', headers: { 'x-admin-token': 'secret' } });
    expect(list.statusCode).toBe(200);
    const items = list.json().items as any[];
    expect(items.some(x => x.id === item_id)).toBe(true);

    const ap = await app.inject({ method: 'POST', url: `/api/admin/certified/items/${item_id}/approve`, headers: { 'x-admin-token': 'secret' } });
    expect(ap.statusCode).toBe(200);
    expect(ap.json().status).toBe('approved');
    expect(ap.headers['access-control-allow-origin']).toBe('*');
    expect(ap.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('enforces size cap 413', async () => {
    vi.stubEnv('ADMIN_MAX_REQUEST_BYTES', '16');
    await app.close();
    app = await createApp();
    const big = 'x'.repeat(1024 * 32);
    const r = await app.inject({ method: 'POST', url: '/api/admin/certified/items/ingest', headers: { 'x-admin-token': 'secret', 'content-type': 'application/json' }, payload: { title: big, url: 'https://example.com' } });
    expect(r.statusCode).toBe(413);
  });
});


