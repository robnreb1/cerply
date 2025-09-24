import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { postCertifiedPlan } from '../../api/generated';

describe('postCertifiedPlan retry/backoff', () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = realFetch as any;
  });

  it('retries once on 5xx with exponential backoff', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    global.fetch = vi.fn(async (url: any, init: any) => {
      calls.push({ url: String(url), init });
      // First call: 500; second: 200
      if (calls.length === 1) {
        return new Response(JSON.stringify({ error: { message: 'fail' } }), { status: 500, headers: { 'content-type': 'application/json' } });
      }
      return new Response(JSON.stringify({ status: 'ok', endpoint: 'certified.plan', request_id: 'r', mode: 'plan', enabled: true, provenance: { planner: 'mock', proposers: ['mock'], checker: 'schema' }, plan: { title: 'T', items: [] } }), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as any;

    const p = postCertifiedPlan('http://example.com', { topic: 'X' });
    // Advance time to allow backoff (250ms)
    await vi.advanceTimersByTimeAsync(300);
    const out = await p;
    expect(out.status).toBe(200);
    expect((global.fetch as any).mock.calls.length).toBe(2);
  });
});


