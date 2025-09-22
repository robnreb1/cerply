import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import createApp from '../src/index';

describe('health and flags endpoints', () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    // Ensure predictable env for flags; default all false unless explicitly set
    vi.unstubAllEnvs();
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  it('GET /api/health returns ok and headers', async () => {
    const r = await app.inject({ method: 'GET', url: '/api/health' });
    expect(r.statusCode).toBe(200);
    const j = r.json() as any;
    expect(j?.ok).toBe(true);
    // Should include env and planner info
    expect(typeof j?.env).toBe('string');
    expect(typeof j?.planner?.provider).toBe('string');
    // Header hints
    expect(r.headers['x-api']).toBe('api-health');
    expect(typeof r.headers['x-planner-default']).toBe('string');
  });

  it('GET /health returns ok with note advising /api/health', async () => {
    const r = await app.inject({ method: 'GET', url: '/health' });
    expect(r.statusCode).toBe(200);
    const j = r.json() as any;
    expect(j?.ok).toBe(true);
    expect(String(j?.note || '')).toMatch(/prefer \/api\/health/);
    expect(r.headers['x-api']).toBe('health');
  });

  it('GET /api/flags echoes env-driven flags', async () => {
    const r = await app.inject({ method: 'GET', url: '/api/flags' });
    expect(r.statusCode).toBe(200);
    const j = r.json() as any;
    expect(j?.flags).toBeTruthy();
    expect(typeof j.flags.ff_quality_bar_v1).toBe('boolean');
    expect(typeof j.flags.ff_connectors_basic_v1).toBe('boolean');
    expect(r.headers['x-api']).toBe('flags');
  });

  it('GET /flags mirrors /api/flags', async () => {
    const r = await app.inject({ method: 'GET', url: '/flags' });
    expect(r.statusCode).toBe(200);
    const j = r.json() as any;
    expect(j?.flags).toBeTruthy();
    expect(typeof j.flags.ff_quality_bar_v1).toBe('boolean');
    expect(typeof j.flags.ff_connectors_basic_v1).toBe('boolean');
    expect(r.headers['x-api']).toBe('flags');
  });
});
