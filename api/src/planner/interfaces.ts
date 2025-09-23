import { z } from 'zod';

export const PlannerInputZ = z.object({
  topic: z.string().min(1),
  level: z.enum(['beginner','intermediate','advanced']).optional(),
  goals: z.array(z.string()).optional(),
});
export type PlannerInput = z.infer<typeof PlannerInputZ>;

export const PlannerItemZ = z.object({ id: z.string(), type: z.literal('card'), front: z.string(), back: z.string() });
export type PlannerItem = z.infer<typeof PlannerItemZ>;

export const PlannerOutputZ = z.object({
  plan: z.object({ title: z.string(), items: z.array(PlannerItemZ).min(1) }),
  provenance: z.object({ planner: z.string(), proposers: z.array(z.string()), checker: z.string() })
});
export type PlannerOutput = z.infer<typeof PlannerOutputZ>;

export interface PlannerEngine {
  name: string;
  generate(input: PlannerInput): Promise<PlannerOutput>;
}


