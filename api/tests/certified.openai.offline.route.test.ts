import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createApp } from '../src/index';

// Ensure the route picks OpenAI adapter but offline behavior (no real network)
vi.mock('openai', () => {
  class OpenAI {
    // @ts-ignore
    constructor(_opts: any) {}
    chat = {
      completions: {
        create: async () => ({ choices: [{ message: { content: 'NOT_JSON' } }] })
      }
    };
  }
  return { default: OpenAI };
});

describe('Certified PLAN route with openai-v0 adapter (offline)', () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    vi.stubEnv('CERTIFIED_ENABLED', 'true');
    vi.stubEnv('CERTIFIED_MODE', 'plan');
    vi.stubEnv('PLANNER_ENGINE', 'openai');
    vi.stubEnv('FF_OPENAI_ADAPTER_V0', 'true');
    // pretend we have a key so route selects adapter; mock ensures no network
    vi.stubEnv('OPENAI_API_KEY', 'fake');
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  it('returns deterministic fallback plan and provenance.engine=openai-v0', async () => {
    const payload = { topic: 'Hashes', level: 'beginner', goals: ['memory'] };
    const r1 = await app.inject({ method: 'POST', url: '/api/certified/plan', headers: { 'content-type': 'application/json' }, payload });
    const r2 = await app.inject({ method: 'POST', url: '/api/certified/plan', headers: { 'content-type': 'application/json' }, payload });
    expect(r1.statusCode).toBe(200);
    expect(r2.statusCode).toBe(200);
    const a = r1.json() as any;
    const b = r2.json() as any;
    expect(a.provenance.engine).toBe('openai-v0');
    // normalize dynamic fields
    delete a.request_id; delete b.request_id;
    expect(JSON.stringify(a.plan)).toBe(JSON.stringify(b.plan));
  });
});
