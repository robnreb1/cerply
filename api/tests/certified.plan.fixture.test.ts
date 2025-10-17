import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createApp } from '../src/index';
import fs from 'node:fs';
import path from 'node:path';

describe('Certified PLAN mode matches golden fixture', () => {
  let app: Awaited<ReturnType<typeof createApp>>;
  beforeAll(async () => {
    vi.stubEnv('CERTIFIED_ENABLED', 'true');
    vi.stubEnv('CERTIFIED_MODE', 'plan');
    app = await createApp();
  });
  afterAll(async () => {
    if (app) await app.close();
    vi.unstubAllEnvs();
  });

  it('matches fixture aside from request_id', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/certified/plan', headers: { 'content-type': 'application/json' }, payload: { topic: 'Hashes' } });
    expect(r.statusCode).toBe(200);
    const j = r.json() as any;
    const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'certified.plan.success.json'), 'utf8'));
    // Normalize dynamic
    expect(typeof j.request_id).toBe('string');
    delete j.request_id;
    // ignore provenance.engine addition
    if (j?.provenance) delete (j.provenance as any).engine;
    expect(j).toEqual(fixture);
  });
});


