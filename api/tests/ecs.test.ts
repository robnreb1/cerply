
import { describe, it, expect } from 'vitest';
import { computeECS } from '../src/utils/ecs.js';

describe('computeECS', () => {
  it('handles zero obligations', () => {
    expect(computeECS(0, 0)).toBe(0);
  });
  it('computes percent with one decimal', () => {
    expect(computeECS(10, 7)).toBe(70);
    expect(computeECS(3, 1)).toBe(33.3);
  });
});
