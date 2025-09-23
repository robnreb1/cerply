import { describe, it, expect } from 'vitest';
import { MockPlanner } from '../src/planner/engines/mock';

describe('MockPlanner determinism', () => {
  it('same input -> same output', async () => {
    const a = await MockPlanner.generate({ topic: 'Hashes' });
    const b = await MockPlanner.generate({ topic: 'Hashes' });
    expect(a).toEqual(b);
  });
  it('different topic -> different ids', async () => {
    const a = await MockPlanner.generate({ topic: 'Hashes' });
    const b = await MockPlanner.generate({ topic: 'Graphs' });
    expect(a.plan.items[0].id).not.toBe(b.plan.items[0].id);
  });
});


