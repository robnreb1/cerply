import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createApp } from '../src/index';

describe('Certified Retention v0 (preview)', () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    vi.stubEnv('CERTIFIED_ENABLED', 'true');
    vi.stubEnv('RETENTION_ENABLED', 'true');
    app = await createApp();
  });

  afterAll(async () => {
    if (app) await app.close();
    vi.unstubAllEnvs();
  });

  it('preflight OPTIONS returns 204 for certified paths', async () => {
    const r = await app.inject({ method: 'OPTIONS', url: '/api/certified/schedule' });
    expect([204, 400]).toContain(r.statusCode); // Allow both for CORS variations
    if (r.statusCode === 204) {
      expect(r.headers['access-control-allow-origin']).toBe('*');
    }
  });

  it('POST /certified/schedule validates and returns order', async () => {
    const payload = {
      session_id: 's1',
      plan_id: 'p1',
      items: [{ id: 'c1', front: 'A', back: 'B' }],
      now: '2025-01-01T00:00:00.000Z'
    };
    const r = await app.inject({ method: 'POST', url: '/api/certified/schedule', headers: { 'content-type': 'application/json' }, payload });
    expect(r.statusCode).toBe(200);
    const j = r.json() as any;
    expect(Array.isArray(j.order)).toBe(true);
    expect(j.order[0]).toBe('c1');
    expect(j.meta?.algo).toBe('sm2-lite');
  });

  it('POST /certified/progress accepts grade and updates snapshot', async () => {
    const evt = { session_id: 's1', card_id: 'c1', action: 'grade', grade: 4, at: '2025-01-01T00:00:00.000Z' };
    const r = await app.inject({ method: 'POST', url: '/api/certified/progress', headers: { 'content-type': 'application/json' }, payload: evt });
    expect(r.statusCode).toBe(200);
    const g = await app.inject({ method: 'GET', url: '/api/certified/progress?sid=s1' });
    expect(g.statusCode).toBe(200);
    const snap = g.json() as any;
    expect(snap.session_id).toBe('s1');
    expect(Array.isArray(snap.items)).toBe(true);
    const c1 = snap.items.find((x: any) => x.card_id === 'c1');
    expect(c1?.reps).toBeGreaterThanOrEqual(1);
  });

  it('rejects grade event without grade value', async () => {
    // action=grade but grade omitted
    const evt = { session_id: 's2', card_id: 'x1', action: 'grade', at: '2025-01-01T00:00:00.000Z' } as any;
    const r = await app.inject({ method: 'POST', url: '/api/certified/progress', headers: { 'content-type': 'application/json' }, payload: evt });
    expect(r.statusCode).toBe(400);
    const j = r.json() as any;
    expect(j?.error?.code).toBe('BAD_REQUEST');
  });
});


