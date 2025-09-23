import { describe, it, expect } from 'vitest';
import { toDeck } from '../../study/presenter';
import fixture from '../../../tests/fixtures/plan.success.json';

describe('presenter toDeck', () => {
  it('maps plan to deck with correct first id and title', () => {
    const d = toDeck(fixture as any);
    expect(d.title).toBe('Plan: Hashes');
    expect(d.cards[0].id).toBe('card-intro-1a4b');
  });
});


