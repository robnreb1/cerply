import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import createApp from '../src/index';

describe('Certified audit preview route', () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  beforeAll(async () => {
    vi.stubEnv('FF_CERTIFIED_AUDIT_PREVIEW', 'true');
    app = await createApp();
  });
  afterAll(async () => { await app.close(); vi.unstubAllEnvs(); });

  it('returns 200 with lines array', async () => {
    const r = await app.inject({ method: 'GET', url: '/api/certified/_audit_preview?limit=5' });
    expect(r.statusCode).toBe(200);
    const j = r.json() as any;
    expect(j && Array.isArray(j.lines)).toBe(true);
    expect(r.headers['access-control-allow-origin']).toBe('*');
  });
});
