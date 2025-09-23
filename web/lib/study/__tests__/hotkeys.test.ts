import { describe, it, expect } from 'vitest';
import { attachHotkeys } from '../../study/hotkeys';

describe('hotkeys', () => {
  it('fires handlers', async () => {
    let flips = 0, nexts = 0, prevs = 0, resets = 0;
    const detach = attachHotkeys(document, {
      flip: () => { flips++; },
      next: () => { nexts++; },
      prev: () => { prevs++; },
      reset: () => { resets++; }
    });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }));
    detach();
    expect(flips).toBe(1); expect(nexts).toBe(1); expect(prevs).toBe(1); expect(resets).toBe(1);
  });
});


