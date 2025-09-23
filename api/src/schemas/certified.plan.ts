import { z } from 'zod';

export const PlanRequestZ = z.object({ topic: z.string().min(1).max(200) });
export type PlanRequest = z.infer<typeof PlanRequestZ>;

export const PlanItemZ = z.object({
  id: z.string(),
  type: z.literal('card'),
  front: z.string(),
  back: z.string(),
});
export type PlanItem = z.infer<typeof PlanItemZ>;

export const PlanResponseZ = z.object({
  status: z.literal('ok'),
  request_id: z.string(),
  endpoint: z.literal('certified.plan'),
  mode: z.union([z.literal('plan'), z.literal('mock')]),
  enabled: z.boolean(),
  provenance: z.object({
    planner: z.string(),
    proposers: z.array(z.string()),
    checker: z.string(),
  }),
  plan: z.object({
    title: z.string(),
    items: z.array(PlanItemZ).min(1),
  }),
});
export type PlanResponse = z.infer<typeof PlanResponseZ>;
