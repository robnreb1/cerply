import type { PlannerEngine, PlannerInput, PlannerOutput } from '../interfaces';

function hash(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function pick(seed: number, arr: string[]): string[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    seed = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
    const j = seed % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const AdaptiveV1Planner: PlannerEngine = {
  name: 'adaptive-v1',
  async generate(input: PlannerInput): Promise<PlannerOutput> {
    const topic = input.topic.trim();
    const level = (input.level || 'beginner');
    const goals = (input.goals || []).map(s => s.toLowerCase());

    const seed = hash(`${topic}|${level}|${goals.join(',')}`);

    const baseTitles = [
      'Foundations', 'Core Concepts', 'Applications', 'Worked Example', 'Pitfalls', 'Review & Practice'
    ];

    // Weight order by level/goals (deterministic): beginners see Foundations earlier; goals with "memory" push Review earlier.
    let titles = pick(seed, baseTitles);
    if (level === 'beginner') titles.sort((a,b) => (a==='Foundations'? -1: a==='Review & Practice' && goals.includes('memory') ? -1: 0));

    const items = titles.slice(0, 5).map((t, i) => ({
      id: `adv1-${(seed % 10007).toString(16)}-${i+1}`,
      type: 'card' as const,
      front: `${topic}: ${t}`,
      back: `Key points for ${t.toLowerCase()}.`
    }));

    return {
      plan: { title: `Adaptive Plan: ${topic}`, items },
      provenance: { planner: 'rule', proposers: ['adaptive-v1'], checker: 'rule' }
    };
  }
};
