import { z } from 'zod';

// --- Orchestrator v0 Schemas (preview) ---

export const OrchestratorLimitsZ = z.object({
  maxSteps: z.number().int().positive().max(100),
  maxWallMs: z.number().int().positive().max(10 * 60 * 1000).optional(),
  maxTokens: z.number().int().positive().optional(),
});

export const TaskStepZ = z.object({
  id: z.string().optional(),
  type: z.string().min(1),
  payload: z.unknown().optional(),
});

export const TaskPacketZ = z.object({
  goal: z.string().min(1),
  scope: z.string().optional(),
  planRef: z.string().optional(),
  steps: z.array(TaskStepZ).default([]),
  limits: OrchestratorLimitsZ,
  flags: z.record(z.string(), z.unknown()).optional(),
});

export type TaskPacket = z.infer<typeof TaskPacketZ>;

export const JobIdZ = z.string().min(6);

export const JobStatusZ = z.object({
  job_id: JobIdZ,
  status: z.enum(['queued','running','finished','failed','cancelled']),
  started_at: z.string().optional(),
  finished_at: z.string().optional(),
  error: z.string().optional(),
  stepsRun: z.number().int().nonnegative().optional(),
});

export type JobStatus = z.infer<typeof JobStatusZ>;

export const OrchestratorEventZ = z.object({
  job_id: JobIdZ,
  t: z.string(),
  type: z.string().min(1),
  data: z.unknown().optional(),
});

export type OrchestratorEvent = z.infer<typeof OrchestratorEventZ>;

// --- helpers: normalize incoming payloads (snake_case → camelCase) ---
export function normalizeTaskPacketInput(input: any): any {
  if (!input || typeof input !== 'object') return input;
  const src = input as Record<string, any>;
  const rawLimits = (src.limits ?? src.limit ?? {}) as Record<string, any>;
  const normalizedLimits = {
    maxSteps: rawLimits.maxSteps ?? rawLimits.max_steps ?? rawLimits["max-steps"],
    maxWallMs: rawLimits.maxWallMs ?? rawLimits.max_wall_ms ?? rawLimits["max-wall-ms"],
    maxTokens: rawLimits.maxTokens ?? rawLimits.max_tokens ?? rawLimits["max-tokens"],
  };
  const limits: any = {};
  if (normalizedLimits.maxSteps != null) limits.maxSteps = Number(normalizedLimits.maxSteps);
  if (normalizedLimits.maxWallMs != null) limits.maxWallMs = Number(normalizedLimits.maxWallMs);
  if (normalizedLimits.maxTokens != null) limits.maxTokens = Number(normalizedLimits.maxTokens);
  const out: any = { ...src };
  if (Object.keys(limits).length > 0) out.limits = limits;
  return out;
}


