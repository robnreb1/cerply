import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import createApp from '../src/index';

describe('Certified PLAN multiphase (proposers → checker → lock)', () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    vi.stubEnv('CERTIFIED_ENABLED', 'true');
    vi.stubEnv('CERTIFIED_MODE', 'plan');
    vi.stubEnv('FF_ADAPTIVE_ENGINE_V1', 'true');
    vi.stubEnv('FF_OPENAI_ADAPTER_V0', 'true');
    vi.stubEnv('FF_CERTIFIED_PROPOSERS', 'true');
    vi.stubEnv('FF_CERTIFIED_CHECKER', 'true');
    vi.stubEnv('FF_CERTIFIED_LOCK', 'true');
    vi.stubEnv('CERTIFIED_PROPOSERS', 'adaptive,openai');
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  it('returns 200 with provenance engines header and lock id', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/certified/plan', headers: { 'content-type': 'application/json' }, payload: { topic: 'Hashing', level: 'beginner', goals: ['basics'] } });
    expect(r.statusCode).toBe(200);
    const hdr = r.headers['x-provenance-engines'];
    expect(typeof hdr).toBe('string');
    expect(String(hdr)).toContain('adaptive-v1');
    expect(String(hdr)).toContain('openai-v0');
    const lockId = r.headers['x-certified-lock-id'];
    expect(typeof lockId).toBe('string');
    const j = r.json() as any;
    expect(j?.lock?.hash).toBeDefined();
    expect(j?.lock?.algo === 'blake3' || j?.lock?.algo === 'sha256').toBe(true);
    expect(Array.isArray(j?.citations || [])).toBe(true);
  });

  it('falls back to single engine when proposers disabled', async () => {
    await app.close();
    vi.stubEnv('FF_CERTIFIED_PROPOSERS', 'false');
    vi.stubEnv('FF_CERTIFIED_CHECKER', 'false');
    app = await createApp();
    const r = await app.inject({ method: 'POST', url: '/api/certified/plan', headers: { 'content-type': 'application/json' }, payload: { topic: 'Trees' } });
    expect(r.statusCode).toBe(200);
    const j = r.json() as any;
    // Should not include lock or citations by default
    expect(j.lock).toBeUndefined();
    expect(j.citations).toBeUndefined();
  });
});


