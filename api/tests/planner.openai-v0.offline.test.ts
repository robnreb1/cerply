import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAIV0Planner } from '../src/planner/engines/openai-v0';

let behavior: 'bad_json'|'429'|'500'|'timeout'|'ok' = 'ok';

vi.mock('openai', () => {
  class OpenAI {
    // @ts-ignore
    constructor(_opts: any) {}
    chat = {
      completions: {
        create: async () => {
          if (behavior === 'timeout') throw new Error('timeout');
          if (behavior === '429') throw new Error('429 Too Many Requests');
          if (behavior === '500') throw new Error('500 Internal Server Error');
          if (behavior === 'bad_json') {
            return { choices: [{ message: { content: 'NOT_JSON' } }] } as any;
          }
          return { choices: [{ message: { content: JSON.stringify({ plan: { title: 'Good', items: [{ id: 'x', type: 'card', front: 'A', back: 'B' }] }, provenance: { planner: 'llm', proposers: ['openai-v0'], checker: 'schema' } }) } }] } as any;
        }
      }
    };
  }
  return { default: OpenAI };
});

describe('OpenAIV0Planner offline fallback', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'fake-key';
  });

  it('falls back deterministically on bad JSON', async () => {
    behavior = 'bad_json';
    const a = await OpenAIV0Planner.generate({ topic: 'TLS', level: 'beginner', goals: ['memory'] });
    const b = await OpenAIV0Planner.generate({ topic: 'TLS', level: 'beginner', goals: ['memory'] });
    expect(a.plan.title).toBe(b.plan.title);
    expect(JSON.stringify(a.plan.items)).toBe(JSON.stringify(b.plan.items));
    expect((a as any).provenance?.proposers).toContain('openai-v0');
    expect((a as any).provenance?.error).toBe('parse_error');
  });

  it('falls back on 429 with model_error', async () => {
    behavior = '429';
    const out = await OpenAIV0Planner.generate({ topic: 'Queues' });
    expect(out.plan.title).toContain('Plan:');
    expect((out as any).provenance?.error).toBe('model_error');
  });

  it('falls back on 500 with model_error', async () => {
    behavior = '500';
    const out = await OpenAIV0Planner.generate({ topic: 'Stacks' });
    expect(out.plan.items.length).toBeGreaterThan(0);
    expect((out as any).provenance?.error).toBe('model_error');
  });

  it('falls back on timeout with model_error', async () => {
    behavior = 'timeout';
    const out = await OpenAIV0Planner.generate({ topic: 'Graphs', level: 'advanced' });
    expect(out.plan.items.length).toBeGreaterThan(0);
    expect((out as any).provenance?.error).toBe('model_error');
  });
});


