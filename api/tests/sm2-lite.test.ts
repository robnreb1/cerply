import { describe, it, expect } from 'vitest';
import { sm2Update, nextDue, Sm2State } from '../src/planner/engines/sm2-lite';

describe('sm2-lite engine', () => {
  it('resets on low grades and increases on good grades deterministically', () => {
    let s: Sm2State = { reps: 0, ef: 2.5, intervalDays: 0 };
    // First success (grade>=3) → reps=1, interval=1
    s = sm2Update(s, 4);
    expect(s.reps).toBe(1);
    expect(s.intervalDays).toBe(1);
    const ef1 = s.ef;

    // Second success → reps=2, interval=6
    s = sm2Update(s, 5);
    expect(s.reps).toBe(2);
    expect(s.intervalDays).toBe(6);
    expect(s.ef).toBeGreaterThanOrEqual(ef1);

    // Third success → interval multiplies by EF
    const prevInt = s.intervalDays;
    s = sm2Update(s, 5);
    expect(s.reps).toBe(3);
    expect(s.intervalDays).toBeGreaterThanOrEqual(prevInt);

    // Failure resets reps and interval
    s = sm2Update(s, 2);
    expect(s.reps).toBe(0);
    expect(s.intervalDays).toBe(0);
    expect(s.ef).toBeLessThanOrEqual(2.5);
  });

  it('computes next due ISO from a base timestamp', () => {
    const ts = '2025-01-01T00:00:00.000Z';
    const due = nextDue(ts, 6);
    expect(due.startsWith('2025-01-07')).toBe(true);
  });
});


