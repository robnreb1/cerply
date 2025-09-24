import type { PlannerInput } from '../interfaces';
import type { ProposerEngine, ProposerResult } from '../interfaces.multiphase';
import { AdaptiveV1Planner } from './adaptive-v1';
import { OpenAIV0Planner } from './openai-v0';

function toDraft(out: { plan: { title: string; items: any[] }, provenance?: any }, engine: string): ProposerResult {
  return {
    planDraft: { title: out.plan.title, items: out.plan.items },
    citations: [],
    rationale: `proposed by ${engine}`,
    engine
  };
}

export const AdaptiveProposer: ProposerEngine = {
  name: 'adaptive-v1',
  async propose(input: PlannerInput): Promise<ProposerResult> {
    try {
      const out = await AdaptiveV1Planner.generate(input);
      return toDraft(out, 'adaptive-v1');
    } catch {
      return { planDraft: { title: `Plan: ${input.topic}`, items: [] }, citations: [], rationale: 'adaptive_failed', engine: 'adaptive-v1' };
    }
  }
};

export const OpenAIProposer: ProposerEngine = {
  name: 'openai-v0',
  async propose(input: PlannerInput): Promise<ProposerResult> {
    try {
      const out = await OpenAIV0Planner.generate(input);
      return toDraft(out, 'openai-v0');
    } catch {
      return { planDraft: { title: `Plan: ${input.topic}`, items: [] }, citations: [], rationale: 'openai_failed', engine: 'openai-v0' };
    }
  }
};


