import { describe, it, expect, beforeEach } from 'vitest';
import { load, save, reset } from '../../study/session';

describe('session storage', () => {
  beforeEach(() => { localStorage.clear(); });

  it('round-trips', () => {
    const hash = 'abc123';
    const state = { idx: 2, flipped: true, order: [2,0,1] };
    expect(load(hash)).toBeNull();
    save(hash, state);
    const got = load(hash);
    expect(got).toEqual(state);
    reset(hash);
    expect(load(hash)).toBeNull();
  });
});


