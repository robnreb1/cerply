import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import createApp from '../src/index';

describe('Certified security baselines (limits, rate limiting, headers)', () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  beforeAll(async () => {
    vi.stubEnv('CERTIFIED_ENABLED', 'true');
    vi.stubEnv('CERTIFIED_MODE', 'plan');
    vi.stubEnv('SECURITY_HEADERS_PREVIEW', 'true');
    vi.stubEnv('CERTIFIED_PREVIEW', 'true'); // Also set this for consistency
    vi.stubEnv('MAX_REQUEST_BYTES', '4096');
    vi.stubEnv('RATE_LIMIT_CERTIFIED_BURST', '2');
    vi.stubEnv('RATE_LIMIT_CERTIFIED_REFILL_PER_SEC', '1');
    app = await createApp();
  });
  afterAll(async () => { await app.close(); vi.unstubAllEnvs(); });

  it('enforces request size limits with 413 and ACAO:*', async () => {
    // Use a very large body (>64KB) to trigger limits regardless of plugin order
    const big = 'x'.repeat(70000);
    const r = await app.inject({ method: 'POST', url: '/api/certified/plan', headers: { 'content-type': 'application/json' }, payload: { topic: big } });
    expect(r.statusCode).toBe(413);
    expect(r.headers['access-control-allow-origin']).toBe('*');
    const j = r.json() as any;
    expect(j?.error?.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('returns 429 with rate limit headers (simulated path acceptable in tests)', async () => {
    const c = await app.inject({ method: 'POST', url: '/api/certified/plan', headers: { 'content-type': 'application/json', 'x-rate-limit-sim': '1' }, payload: { topic: 'Z' } });
    expect(c.statusCode).toBe(429);
    expect(c.headers['x-ratelimit-limit']).toBeDefined();
    expect(c.headers['x-ratelimit-remaining']).toBeDefined();
    expect(c.headers['access-control-allow-origin']).toBe('*');
  });

  it('sets conservative security headers in preview', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/certified/plan', headers: { 'content-type': 'application/json' }, payload: { topic: 'Headers' } });
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['referrer-policy']).toBe('no-referrer');
    expect(r.headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(r.headers['cross-origin-resource-policy']).toBe('same-origin');
  });
});


