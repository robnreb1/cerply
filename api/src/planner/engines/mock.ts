import type { PlannerEngine, PlannerInput, PlannerOutput } from '../interfaces';

function hashTopic(topic: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < topic.length; i++) {
    h ^= topic.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const MockPlanner: PlannerEngine = {
  name: 'mock',
  async generate(input: PlannerInput): Promise<PlannerOutput> {
    const topic = input.topic.trim();
    const seed = hashTopic(topic);
    const id = (suffix: string) => `${suffix}-${(seed % 9973).toString(16)}`;
    const items = [
      { id: id('card-intro'), type: 'card' as const, front: `Overview: ${topic}`, back: `${topic} — key ideas in brief.` },
      { id: id('card-core-1'), type: 'card' as const, front: `${topic}: Core Concept 1`, back: 'What it is and why it matters.' },
      { id: id('card-core-2'), type: 'card' as const, front: `${topic}: Core Concept 2`, back: 'How to apply it in practice.' },
      { id: id('card-check'), type: 'card' as const, front: `Check understanding: ${topic}`, back: 'Recall the essentials and one example.' },
      { id: id('card-review'), type: 'card' as const, front: `Review: ${topic}`, back: 'Summarise in 3 bullet points.' }
    ];
    return {
      plan: { title: `Plan: ${topic}`, items },
      provenance: { planner: 'rule', proposers: ['ruleA','ruleB'], checker: 'rule' }
    };
  }
};


