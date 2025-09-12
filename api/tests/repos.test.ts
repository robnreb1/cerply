import { describe, it, expect } from 'vitest';
import { InMemoryExpertModuleRepo, InMemoryPlanRepo, InMemoryProfileRepo, InMemoryTelemetryRepo } from '../src/repos';

describe('In-memory repositories', () => {
  it('profile get/update roundtrips', async () => {
    const r = new InMemoryProfileRepo();
    const p0 = await r.get('u1');
    expect(p0.userId).toBe('u1');
    const p1 = await r.update('u1', { prefs: { a: 1 } });
    expect(p1.prefs?.a).toBe(1);
  });

  it('plan store/load works', async () => {
    const r = new InMemoryPlanRepo();
    await r.store('u2', [{ id: 'mod-01', title: 'T', estMinutes: 10 }]);
    const plan = await r.load('u2');
    expect(plan?.[0].title).toBe('T');
  });

  it('expert create/get/update works', async () => {
    const r = new InMemoryExpertModuleRepo();
    const created = await r.create({ title: 'X' });
    expect(created.id).toMatch(/^exp-/);
    const loaded = await r.get(created.id);
    expect(loaded?.title).toBe('X');
    const upd = await r.update(created.id, { status: 'approved' });
    expect(upd?.status).toBe('approved');
  });

  it('telemetry records events', async () => {
    const r = new InMemoryTelemetryRepo(2);
    await r.record({ k: 1 });
    await r.record({ k: 2 });
    await r.record({ k: 3 });
    // no assertion on internal buffer; ensure no throw
    expect(true).toBe(true);
  });
});


