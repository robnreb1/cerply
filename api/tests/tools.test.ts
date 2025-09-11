import { describe, it, expect } from 'vitest';
import { searchWeb, kbFetch, profileRead, profileWrite, modulesStore, modulesLoad, analyticsRecord } from '../src/tools';

describe('tools', () => {
  it('searchWeb returns limited results from whitelist', async () => {
    const r = await searchWeb('algebra', { limit: 3 });
    expect(r.results.length).toBe(3);
    for (const row of r.results) {
      expect(row.url).toMatch(/^https:\/\//);
      expect(row.title.toLowerCase()).toContain('algebra');
    }
  });

  it('kbFetch returns stub content for certified and user_private', async () => {
    const a = await kbFetch('cerply_certified', 'pack-1');
    expect(a.content?.metadata?.certified).toBe(true);
    const b = await kbFetch('user_private', 'note-1');
    expect(b.content?.notes).toContain('note-1');
  });

  it('profile read/write merges prefs and persists in memory', async () => {
    const u = 'dev-user';
    const p0 = await profileRead(u);
    expect(p0.userId).toBe(u);
    const p1 = await profileWrite(u, { prefersRefresher: true });
    expect(p1.prefs?.prefersRefresher).toBe(true);
    const p2 = await profileRead(u);
    expect(p2.prefs?.prefersRefresher).toBe(true);
  });

  it('modules store and load round-trip', async () => {
    const u = 'dev-user-2';
    await modulesStore(u, [{ id: 'mod-01', title: 'Foundations', estMinutes: 10 }]);
    const plan = await modulesLoad(u);
    expect(plan).toBeTruthy();
    expect(plan![0].title).toContain('Foundations');
  });

  it('analyticsRecord returns ok', async () => {
    const r = await analyticsRecord({ kind: 'unit_test', ts: new Date().toISOString() });
    expect(r.ok).toBe(true);
  });
});


