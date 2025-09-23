import { describe, it, expect } from 'vitest';
import { OpenAIV0Planner } from '../src/planner/engines/openai-v0';

describe('OpenAIV0Planner', () => {
  it('falls back deterministically when no OPENAI_API_KEY', async () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const a = await OpenAIV0Planner.generate({ topic: 'TLS', level: 'beginner', goals: ['memory'] });
    const b = await OpenAIV0Planner.generate({ topic: 'TLS', level: 'beginner', goals: ['memory'] });
    expect(a.plan.title).toBe(b.plan.title);
    expect(JSON.stringify(a.plan.items)).toBe(JSON.stringify(b.plan.items));
    process.env.OPENAI_API_KEY = prev;
  });

  it('returns parse-validated shape when key present (skip if absent)', async () => {
    if (!process.env.OPENAI_API_KEY) return; // CI-safe
    const out = await OpenAIV0Planner.generate({ topic: 'Queues' });
    expect(typeof out.plan.title).toBe('string');
    expect(Array.isArray(out.plan.items)).toBe(true);
    expect(out.plan.items.length).toBeGreaterThan(0);
  });
});


