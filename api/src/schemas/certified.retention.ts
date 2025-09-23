import { z } from 'zod';

export const CardZ = z.object({
  id: z.string(),
  type: z.literal('card').optional().default('card'),
  front: z.string().min(1),
  back: z.string().min(1),
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
  action: z.enum(['grade','flip','reset']),
  grade: z.number().int().min(0).max(5).optional(),
  at: z.string().datetime(),
});
export type ProgressEvent = z.infer<typeof ProgressEventZ>;

export const ProgressSnapshotZ = z.object({
  session_id: z.string(),
  items: z.array(ProgressZ),
});
export type ProgressSnapshot = z.infer<typeof ProgressSnapshotZ>;


