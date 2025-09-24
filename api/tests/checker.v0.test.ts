import { describe, it, expect } from 'vitest';
import { CheckerV0 } from '../src/planner/engines/checker-v0';
import type { ProposerResult } from '../src/planner/interfaces.multiphase';

describe('CheckerV0 selection heuristics', () => {
  it('prefers proposal with higher citation coverage and overlap', async () => {
    const input = { topic: 'Hashing', level: 'beginner' as const, goals: ['basics'] };
    const a: ProposerResult = {
      engine: 'adaptive-v1',
      rationale: 'deterministic outline',
      citations: [
        { id: 'c1', url: 'https://example.com/a' },
        { id: 'c2', url: 'https://example.com/b' },
      ],
      planDraft: {
        title: 'Adaptive Plan: Hashing',
        items: [
          { id: '1', type: 'card', front: 'Hashes: Foundations', back: '...' },
          { id: '2', type: 'card', front: 'Hashes: Core Concepts', back: '...' },
        ],
      },
    };
    const b: ProposerResult = {
      engine: 'openai-v0',
      rationale: 'json adapter',
      citations: [],
      planDraft: {
        title: 'Plan',
        items: [
          { id: 'x', type: 'card', front: 'Overview', back: '...' },
        ],
      },
    };

    const decision = await CheckerV0.check(input, [b, a]);
    expect(decision.finalPlan.title).toContain('Hashing');
    expect(decision.decisionNotes).toContain('selected:adaptive-v1');
    expect(Array.isArray(decision.usedCitations)).toBe(true);
    expect(decision.usedCitations.length).toBe(2);
  });

  it('returns empty plan when no valid proposals', async () => {
    const input = { topic: 'Trees', level: 'beginner' as const } as any;
    const decision = await CheckerV0.check(input, []);
    expect(decision.finalPlan.items.length).toBe(0);
    expect(decision.decisionNotes).toBe('no_valid_proposals');
  });
});


