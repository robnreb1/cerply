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
  status: z.enum(['queued','running','succeeded','failed','canceled']),
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

// Accept snake_case limits in input by normalizing to camelCase prior to validation
export function normalizeTaskPacketInput<T extends Record<string, any>>(value: T): T {
  if (!value || typeof value !== 'object') return value;
  const v = { ...(value as any) } as any;
  const src = (v.limits ?? v.limit ?? {}) as Record<string, any>;
  const limits: any = {};
  if (src.maxSteps != null) limits.maxSteps = Number(src.maxSteps);
  if (src.max_wall_ms != null) limits.maxWallMs = Number(src.max_wall_ms);
  if (src.maxWallMs != null) limits.maxWallMs = Number(src.maxWallMs);
  if (src.max_tokens != null) limits.maxTokens = Number(src.max_tokens);
  if (src.maxTokens != null) limits.maxTokens = Number(src.maxTokens);
  if (Object.keys(limits).length > 0) v.limits = limits;
  return v as T;
}
