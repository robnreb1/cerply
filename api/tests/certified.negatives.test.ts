import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createApp } from '../src/index';

describe('Certified PLAN negatives (413, 429) with CORS headers', () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    vi.stubEnv('CERTIFIED_ENABLED', 'true');
    vi.stubEnv('CERTIFIED_MODE', 'plan');
    vi.stubEnv('RATE_LIMIT_CERTIFIED_BURST', '2');
    vi.stubEnv('RATE_LIMIT_CERTIFIED_REFILL_PER_SEC', '1');
    app = await createApp();
  });

  afterAll(async () => {
    if (app) if (app) await app.close();
    vi.unstubAllEnvs();
  });

  it('returns 413 for payload >16KB and ACAO:*', async () => {
    const bigTopic = 'a'.repeat(17000);
    const r = await app.inject({ method: 'POST', url: '/api/certified/plan', headers: { 'content-type': 'application/json' }, payload: { topic: bigTopic } });
    expect(r.statusCode).toBe(413);
    expect(r.headers['access-control-allow-origin']).toBe('*');
    expect(r.headers['access-control-allow-credentials']).toBeUndefined();
    const j = r.json() as any;
    expect(j?.error?.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('returns 429 with x-ratelimit-* and ACAO:*', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/certified/plan', headers: { 'content-type': 'application/json', 'x-rate-limit-sim': '1' }, payload: { topic: 'Trees' } });
    expect(r.statusCode).toBe(429);
    expect(r.headers['access-control-allow-origin']).toBe('*');
    expect(r.headers['access-control-allow-credentials']).toBeUndefined();
    expect(r.headers['x-ratelimit-limit']).toBeDefined();
    expect(r.headers['x-ratelimit-remaining']).toBeDefined();
    const j = r.json() as any;
    expect(j?.error?.code).toBe('RATE_LIMITED');
  });
});


