import { describe, it, expect } from 'vitest';
import { AdaptiveV1Planner } from '../src/planner/engines/adaptive-v1';

describe('AdaptiveV1Planner', () => {
  it('is deterministic for same input', async () => {
    const a = await AdaptiveV1Planner.generate({ topic: 'Hashes', level: 'beginner', goals: ['memory'] });
    const b = await AdaptiveV1Planner.generate({ topic: 'Hashes', level: 'beginner', goals: ['memory'] });
    expect(a.plan.title).toBe(b.plan.title);
    expect(JSON.stringify(a.plan.items)).toBe(JSON.stringify(b.plan.items));
  });

  it('changes ordering with level/goals', async () => {
    const beg = await AdaptiveV1Planner.generate({ topic: 'Hashes', level: 'beginner', goals: [] });
    const adv = await AdaptiveV1Planner.generate({ topic: 'Hashes', level: 'advanced', goals: [] });
    expect(JSON.stringify(beg.plan.items)).not.toBe(JSON.stringify(adv.plan.items));
  });
});
