import { z } from 'zod';
import type { PlannerInput, PlannerItem } from './interfaces';

// Shared citation type for multiphase planner
export const CitationZ = z.object({
  id: z.string(),
  url: z.string(),
  title: z.string().optional(),
});
export type Citation = z.infer<typeof CitationZ>;

export type PlanDraft = {
  title: string;
  items: PlannerItem[];
};

export type ProposerResult = {
  planDraft: PlanDraft;
  citations: Citation[];
  rationale: string;
  engine: string; // e.g., "adaptive-v1" | "openai-v0" | "mock"
};

export interface ProposerEngine {
  name: string;
  propose(input: PlannerInput): Promise<ProposerResult>;
}

export type CheckerDecision = {
  finalPlan: PlanDraft;
  decisionNotes: string;
  usedCitations: Citation[];
};

export interface CheckerEngine {
  name: string;
  check(input: PlannerInput, proposals: ProposerResult[]): Promise<CheckerDecision>;
}


