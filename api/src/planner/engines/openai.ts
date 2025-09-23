import type { PlannerEngine, PlannerInput, PlannerOutput } from '../interfaces';

export const OpenAIPlanner: PlannerEngine = {
  name: 'openai',
  async generate(_input: PlannerInput): Promise<PlannerOutput> {
    const engine = (process.env.PLANNER_ENGINE || '').toLowerCase();
    const key = process.env.OPENAI_API_KEY || '';
    if (engine !== 'openai' || !key) {
      throw new Error('OPENAI_ADAPTER_DISABLED');
    }
    // Adapter intentionally inert in CI (no network call). Implementation can be added with secrets.
    throw new Error('OPENAI_ADAPTER_NOT_IMPLEMENTED');
  }
};


