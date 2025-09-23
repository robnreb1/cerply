import OpenAI from 'openai';
import type { PlannerEngine, PlannerInput, PlannerOutput } from '../interfaces';

// Simple deterministic hash for fallback determinism
function hashDeterministic(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function deterministicFallback(input: PlannerInput): PlannerOutput {
  const topic = input.topic.trim();
  const level = String(input.level || 'beginner');
  const goals = (input.goals || []).join(',');
  const seed = hashDeterministic(`${topic}|${level}|${goals}`);
  const id = (suffix: string, i: number) => `oai0-${(seed % 10007).toString(16)}-${suffix}-${i+1}`;
  const titles = ['Overview', 'Core Concept', 'Application', 'Check', 'Review'];
  const items = titles.slice(0, 5).map((t, i) => ({
    id: id(t.toLowerCase().replace(/\s+/g, '-'), i),
    type: 'card' as const,
    front: `${topic}: ${t}`,
    back: `Key points for ${t.toLowerCase()}.`
  }));
  return {
    plan: { title: `Plan: ${topic}`, items },
    provenance: { planner: 'llm', proposers: ['openai-v0'], checker: 'schema' }
  };
}

const UA = 'cerply-api/openai-v0';
const MODEL = process.env.OPENAI_PLANNER_MODEL || 'gpt-4o-mini';
const MAX_TOKENS = 600; // conservative cap

export const OpenAIV0Planner: PlannerEngine = {
  name: 'openai-v0',
  async generate(input: PlannerInput): Promise<PlannerOutput> {
    // Adapter is preview-only; route gates activation via FF_OPENAI_ADAPTER_V0 and PLANNER_ENGINE
    const apiKey = process.env.OPENAI_API_KEY || '';

    // Offline/CI-safe deterministic fallback when no key
    if (!apiKey) {
      return deterministicFallback(input);
    }

    // Build conservative, JSON-only prompt
    const sys = [
      'You are a strict JSON planner. Output ONLY valid JSON matching this TypeScript shape:',
      '{ "plan": { "title": string, "items": Array<{ id: string, type: "card", front: string, back: string }> },',
      '  "provenance": { "planner": string, "proposers": string[], "checker": string } }',
      'No markdown, no comments, no prose. Keep items between 4-6. IDs must be stable if topic repeats.'
    ].join(' ');

    const user = {
      topic: input.topic,
      level: input.level || null,
      goals: input.goals || []
    } as const;

    const client = new OpenAI({ apiKey, defaultHeaders: { 'User-Agent': UA } });

    try {
      const resp = await client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: JSON.stringify(user) }
        ],
        temperature: 0.2,
        max_tokens: MAX_TOKENS,
        stream: false,
        user: 'planner-openai-v0'
      });
      const content = resp.choices?.[0]?.message?.content || '';
      // Parse and validate to our contract; on error, fallback and annotate provenance
      try {
        const parsed = JSON.parse(content);
        // Minimal structural guard before trusting
        const title = String(parsed?.plan?.title || '').trim();
        const items = Array.isArray(parsed?.plan?.items) ? parsed.plan.items : [];
        const normalized = {
          plan: {
            title: title.length ? title : `Plan: ${input.topic}`,
            items: items.map((it: any, i: number) => ({
              id: String(it?.id || `oai0-${i+1}`),
              type: 'card' as const,
              front: String(it?.front || `About: ${input.topic}`),
              back: String(it?.back || 'Key points.')
            })).filter((it: any) => it.id && it.front && it.back)
          },
          provenance: { planner: 'llm', proposers: ['openai-v0'], checker: 'schema' }
        } satisfies PlannerOutput;

        if (!normalized.plan.items.length) throw new Error('empty_items');
        return normalized;
      } catch {
        const fb = deterministicFallback(input);
        (fb as any).provenance = { ...fb.provenance, error: 'parse_error' };
        return fb;
      }
    } catch {
      // Network or model error → deterministic fallback (do not fail route)
      const fb = deterministicFallback(input);
      (fb as any).provenance = { ...fb.provenance, error: 'model_error' };
      return fb;
    }
  }
};


