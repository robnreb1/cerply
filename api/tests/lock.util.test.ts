import { describe, it, expect } from 'vitest';
import { canonicalizePlan, computeLock } from '../src/planner/lock';

describe('Lock canonicalization and hashing', () => {
  it('canonicalizes with stable key order and ignores volatile fields', () => {
    const planA = { title: 'Plan: X', items: [{ id: '1', type: 'card', front: 'A', back: 'B', __meta: { t: 1 } }], _debug: true };
    const planB = { _debug: false, items: [{ back: 'B', type: 'card', id: '1', front: 'A' }], title: 'Plan: X' };
    const a = canonicalizePlan(planA);
    const b = canonicalizePlan(planB);
    expect(a.json).toBe(b.json);
    expect(a.bytes).toBe(b.bytes);
  });

  it('produces deterministic hash for equivalent plans', () => {
    const planA = { title: 'Plan: Y', items: [{ id: '1', type: 'card', front: 'K', back: 'V' }] };
    const planB = { title: 'Plan: Y', items: [{ id: '1', type: 'card', back: 'V', front: 'K' }] };
    const l1 = computeLock(planA);
    const l2 = computeLock(planB);
    expect(l1.hash).toBe(l2.hash);
    expect(l1.canonical_bytes).toBe(l2.canonical_bytes);
    expect(['blake3','sha256']).toContain(l1.algo);
  });
});


