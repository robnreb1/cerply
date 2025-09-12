import { describe, it, expect } from 'vitest';
import { adaptModulesForProfile } from '../src/profileAdapt';

describe('profile adaptation', () => {
  it('prefixes Foundations for beginner', () => {
    const mods = [{ id: 'mod-01', title: 'Algebra I', estMinutes: 10 }];
    const out = adaptModulesForProfile(mods, { level: 'beginner' });
    expect(out[0].title.toLowerCase()).toContain('foundations');
  });

  it('appends Review & Practice when preferRefresher', () => {
    const mods = [{ id: 'mod-01', title: 'Topic A', estMinutes: 10 }];
    const out = adaptModulesForProfile(mods, { preferRefresher: true });
    expect(out[out.length - 1].title.toLowerCase()).toContain('review');
  });

  it('adds Focus module when focus provided and not present', () => {
    const mods = [{ id: 'mod-01', title: 'Topic A', estMinutes: 10 }];
    const out = adaptModulesForProfile(mods, { focus: 'declensions' });
    expect(out.some(m => /focus: declensions/i.test(m.title))).toBe(true);
  });
});


