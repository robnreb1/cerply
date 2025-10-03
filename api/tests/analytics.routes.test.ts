import { describe, it, expect } from 'vitest';

describe('Analytics Preview Routes', () => {
  it('OPTIONS returns 204 and ACAO:*', async () => {
    process.env.PREVIEW_ANALYTICS = 'true';
    const { createApp } = await import('../src');
    const app = await createApp();
    const res = await app.inject({ method: 'OPTIONS', url: '/api/analytics/ingest' });
    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  it('POST ingest enforces content-type and secret when set', async () => {
    process.env.PREVIEW_ANALYTICS = 'true';
    process.env.ANALYTICS_INGEST_SECRET = 't';
    const { createApp } = await import('../src');
    const app = await createApp();
    const r415 = await app.inject({ method: 'POST', url: '/api/analytics/ingest', payload: '{}' });
    expect(r415.statusCode).toBe(415);
    const r401 = await app.inject({ method: 'POST', url: '/api/analytics/ingest', headers: { 'content-type':'application/json' }, payload: '{}' });
    expect([400,401]).toContain(r401.statusCode);
    const r401b = await app.inject({ method: 'POST', url: '/api/analytics/ingest', headers: { 'content-type':'application/json', authorization: 'Bearer bad' }, payload: JSON.stringify({ events: [] }) });
    expect([400,401]).toContain(r401b.statusCode);
  });

  it('ingest + aggregate roundtrip', async () => {
    process.env.PREVIEW_ANALYTICS = 'true';
    delete process.env.ANALYTICS_INGEST_SECRET;
    const { createApp } = await import('../src');
    const app = await createApp();
    const now = new Date().toISOString();
    const ingest = await app.inject({ method: 'POST', url: '/api/analytics/ingest', headers: { 'content-type':'application/json' }, payload: JSON.stringify({ events: [ { event:'plan_request', ts: now, anon_session_id: 's1', context:{ topic:'Hashes', engine:'mock' } } ] }) });
    expect(ingest.statusCode).toBe(204);
    const agg = await app.inject({ method: 'GET', url: '/api/analytics/aggregate' });
    expect(agg.statusCode).toBe(200);
    const json = JSON.parse(agg.body);
    expect(json?.totals?.by_event?.plan_request).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(json?.totals?.by_day)).toBe(true);
  });
});


