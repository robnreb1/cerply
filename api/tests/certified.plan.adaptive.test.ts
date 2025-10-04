import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createApp } from '../src/index';

describe('Certified PLAN with adaptive engine (preview, gated)', () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    vi.stubEnv('CERTIFIED_ENABLED', 'true');
    vi.stubEnv('CERTIFIED_MODE', 'plan');
    vi.stubEnv('PLANNER_ENGINE', 'adaptive');
    vi.stubEnv('FF_ADAPTIVE_ENGINE_V1', 'true');
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  it('returns adaptive-v1 provenance when flag+engine enabled', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/certified/plan', headers: { 'content-type': 'application/json' }, payload: { topic: 'Hashes', level: 'beginner' } });
    expect(r.statusCode).toBe(200);
    const j = r.json() as any;
    expect(j?.provenance?.engine).toBe('adaptive-v1');
    expect(Array.isArray(j?.plan?.items)).toBe(true);
    expect(j.plan.items.length).toBeGreaterThan(0);
  });
});


