import assert from 'node:assert';
import { renderTitle, pickCards } from './certifiedPlan.mjs';

const sample = {
  status: 'ok',
  endpoint: 'certified.plan',
  mode: 'plan',
  enabled: true,
  request_id: 'u',
  provenance: { planner: 'rule', proposers: ['ruleA','ruleB'], checker: 'rule' },
  plan: {
    title: 'Plan: Hashes',
    items: [
      { id: 'card-intro', type: 'card', front: 'Overview', back: '...' },
      { id: 'x', type: 'free' }
    ]
  }
};

assert.strictEqual(renderTitle(sample), 'Plan: Hashes');
const cards = pickCards(sample);
assert.ok(Array.isArray(cards) && cards.length >= 1);
assert.strictEqual(cards[0].type, 'card');
console.log('presenter plan ok');
