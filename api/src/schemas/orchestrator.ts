import { z } from 'zod';

// --- Orchestrator v0 Schemas (preview) ---

export const OrchestratorLimitsZ = z.object({
  maxSteps: z.number().int().positive().max(100),
  maxWallMs: z.number().int().positive().max(10 * 60 * 1000),
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


