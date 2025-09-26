import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import createApp from '../src/index';
import { computeLock } from '../src/planner/lock';

describe('Certified Verify API', () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  beforeAll(async () => {
    vi.stubEnv('CERTIFIED_ENABLED', 'true');
    vi.stubEnv('CERTIFIED_MODE', 'plan');
    app = await createApp();
  });
  afterAll(async () => { await app.close(); vi.unstubAllEnvs(); });

  it('OPTIONS preflight returns 204 and ACAO:*', async () => {
    const r = await app.inject({ method: 'OPTIONS', url: '/api/certified/verify', headers: { origin: 'https://app.cerply.com', 'access-control-request-method': 'POST' } });
    expect(r.statusCode).toBe(204);
    expect(r.headers['access-control-allow-origin']).toBe('*');
  });

  it('returns 415 when content-type is not application/json', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/certified/verify', headers: { 'content-type': 'text/plain' }, payload: 'x' });
    expect(r.statusCode).toBe(415);
    expect(r.headers['access-control-allow-origin']).toBe('*');
  });

  it('returns 400 on bad schema', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/certified/verify', headers: { 'content-type': 'application/json' }, payload: { foo: 'bar' } });
    expect(r.statusCode).toBe(400);
    expect(r.headers['access-control-allow-origin']).toBe('*');
  });

  it('returns 200 ok:true when lock matches', async () => {
    const plan = { title: 'Mock Plan', items: [{ id: 'm1', type: 'card', front: 'A', back: 'B' }] };
    const lock = computeLock(plan);
    const r = await app.inject({ method: 'POST', url: '/api/certified/verify', headers: { 'content-type': 'application/json' }, payload: { plan, lock } });
    expect(r.statusCode).toBe(200);
    const j = r.json() as any;
    expect(j.ok).toBe(true);
    expect(j?.computed?.hash).toBe(lock.hash);
  });

  it('returns 200 ok:false when hash mismatches', async () => {
    const plan = { title: 'Mock Plan', items: [{ id: 'm1', type: 'card', front: 'A', back: 'B' }] };
    const lock = computeLock(plan);
    const bad = { ...lock, hash: 'deadbeef' + lock.hash.slice(8) };
    const r = await app.inject({ method: 'POST', url: '/api/certified/verify', headers: { 'content-type': 'application/json' }, payload: { plan, lock: bad } });
    expect(r.statusCode).toBe(200);
    const j = r.json() as any;
    expect(j.ok).toBe(false);
    expect(j?.mismatch?.reason).toBe('hash');
  });
});
