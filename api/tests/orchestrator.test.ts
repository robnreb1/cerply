import { describe, it, expect } from 'vitest';
import { decideNextAction, extractAppendModuleTitle } from '../src/orchestrator';

describe('orchestrator helpers', () => {
  it('extracts append title from free text', () => {
    expect(extractAppendModuleTitle('add speaking practice')).toBe('Focus: Speaking practice');
    expect(extractAppendModuleTitle('include vocabulary drills please')).toBe('Focus: Vocabulary drills');
    expect(extractAppendModuleTitle('append Module 3: grammar review.')).toBe('Focus: Grammar review');
    expect(extractAppendModuleTitle('no change')).toBeNull();
  });

  it('decides generate when confirming with existing plan', () => {
    const msgs = [{ role: 'user', content: 'confirm' } as any];
    const d = decideNextAction(msgs, true);
    expect(d.action).toBe('generate');
  });

  it('decides revise when asking to add item', () => {
    const msgs = [{ role: 'user', content: 'please add speaking practice' } as any];
    const d = decideNextAction(msgs, true);
    expect(d.action).toBe('revise');
  });

  it('decides plan when no plan exists', () => {
    const msgs = [{ role: 'user', content: 'learn astrophysics' } as any];
    const d = decideNextAction(msgs, false);
    expect(d.action).toBe('plan');
  });
});


