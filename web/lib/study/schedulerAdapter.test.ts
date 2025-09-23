// web/lib/study/schedulerAdapter.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { schedule, getProgress, postProgress } from './retentionClient';

const realFetch = global.fetch;

describe('retentionClient adapters', () => {
  beforeEach(() => { (global as any).fetch = vi.fn(); });
  afterEach(() => { (global as any).fetch = realFetch; vi.restoreAllMocks(); });

  it('schedule posts JSON and returns 200 body', async () => {
    (global as any).fetch.mockResolvedValueOnce(new Response(JSON.stringify({ order: ['c1'], meta: { algo: 'sm2-lite', version: 'v0' } }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const r = await schedule({ session_id: 's', plan_id: 'p', items: [{ id: 'c1', front: 'A', back: 'B' }], algo: 'sm2-lite' });
    expect(r.status).toBe(200);
    expect(Array.isArray(r.json.order)).toBe(true);
  });

  it('getProgress returns 200 snapshot', async () => {
    (global as any).fetch.mockResolvedValueOnce(new Response(JSON.stringify({ session_id: 's', items: [] }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const r = await getProgress('s');
    expect(r.status).toBe(200);
    expect(r.json.session_id).toBe('s');
  });

  it('postProgress returns 400 on missing grade (server)', async () => {
    (global as any).fetch.mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: 'BAD_REQUEST' } }), { status: 400, headers: { 'content-type': 'application/json' } }));
    const r = await postProgress({ session_id: 's', card_id: 'c1', action: 'grade', at: new Date().toISOString() } as any);
    expect(r.status).toBe(400);
    expect(r.json?.error?.code).toBe('BAD_REQUEST');
  });
});
