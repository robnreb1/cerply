import { describe, it, expect } from 'vitest';
import { sm2Update, Sm2State } from '../src/planner/engines/sm2-lite';

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

describe('SM2-lite property tests', () => {
  it('EF stays within [1.3, 3.0] and intervals non-negative', () => {
    for (let trial = 0; trial < 200; trial++) {
      let s: Sm2State = { reps: 0, ef: 2.5, intervalDays: 0 };
      for (let i = 0; i < 100; i++) {
        const grade = randInt(0, 5);
        s = sm2Update(s, grade);
        expect(s.ef).toBeGreaterThanOrEqual(1.3);
        expect(s.ef).toBeLessThanOrEqual(3.0);
        expect(s.intervalDays).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('low grades (<3) reset repetitions and interval', () => {
    let s: Sm2State = { reps: 2, ef: 2.5, intervalDays: 6 };
    for (let grade = 0; grade < 3; grade++) {
      const next = sm2Update(s, grade);
      expect(next.reps).toBe(0);
      expect(next.intervalDays).toBe(0);
    }
  });

  it('monotone progression does not produce negative intervals', () => {
    let s: Sm2State = { reps: 0, ef: 2.5, intervalDays: 0 };
    const grades = [3, 4, 5, 5, 4, 3, 5, 5];
    for (const g of grades) {
      s = sm2Update(s, g);
      expect(s.intervalDays).toBeGreaterThanOrEqual(0);
      expect(s.ef).toBeGreaterThanOrEqual(1.3);
      expect(s.ef).toBeLessThanOrEqual(3.0);
    }
  });
});


