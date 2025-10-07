import { z } from 'zod';

export const CardZ = z.object({
  id: z.string(),
  type: z.literal('card').optional().default('card'),
  front: z.string().min(1).optional(),
  back: z.string().min(1).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
});
export type Card = z.infer<typeof CardZ>;

export const ProgressZ = z.object({
  card_id: z.string(),
  reps: z.number().int().min(0).default(0),
  ef: z.number().min(1.3).max(3.0).default(2.5),
  intervalDays: z.number().int().min(0).default(0),
  lastGrade: z.number().int().min(0).max(5).optional(),
  dueISO: z.string().datetime(),
});
export type Progress = z.infer<typeof ProgressZ>;

export const ScheduleRequestZ = z.object({
  session_id: z.string().min(1),
  plan_id: z.string().min(1),
  items: z.array(CardZ).min(1),
  prior: z.array(ProgressZ).optional(),
  algo: z.literal('sm2-lite').optional().default('sm2-lite'),
  now: z.string().datetime().optional(),
});
export type ScheduleRequest = z.infer<typeof ScheduleRequestZ>;

export const ScheduleResponseZ = z.object({
  session_id: z.string(),
  plan_id: z.string(),
  order: z.array(z.string()).min(1),
  due: z.string().datetime(),
  meta: z.object({ algo: z.literal('sm2-lite'), version: z.literal('v0') })
});
export type ScheduleResponse = z.infer<typeof ScheduleResponseZ>;

export const ProgressEventZ = z.object({
  session_id: z.string().min(1),
  card_id: z.string().min(1),
  action: z.enum(['grade','flip','reset','submit']), // 'submit' for auto-assessment
  // Legacy field (ignored in auto-assessment mode, kept for backward compat)
  grade: z.number().int().min(0).max(5).optional(),
  at: z.string().datetime(),
  // New: telemetry for auto-assessment
  result: z.object({
    correct: z.boolean(),
    latency_ms: z.number().int().min(0),
    item_difficulty: z.enum(['easy', 'medium', 'hard']),
    item_type: z.enum(['mcq', 'free', 'card']).optional(),
    hint_count: z.number().int().min(0).default(0),
    retry_count: z.number().int().min(0).default(0),
  }).optional(),
});
export type ProgressEvent = z.infer<typeof ProgressEventZ>;

export const ProgressSnapshotZ = z.object({
  session_id: z.string(),
  items: z.array(ProgressZ),
});
export type ProgressSnapshot = z.infer<typeof ProgressSnapshotZ>;


