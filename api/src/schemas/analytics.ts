import { z } from 'zod';

export const AnalyticsEventZ = z.object({
  event: z.enum(['plan_request','study_flip','study_next','study_prev','study_reset','study_shuffle','study_complete']),
  ts: z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'ts must be ISO date string'),
  anon_session_id: z.string().min(1),
  page_id: z.string().optional(),
  props: z.record(z.any()).optional(),
  context: z.object({
    topic: z.string().optional(),
    level: z.enum(['beginner','intermediate','advanced']).optional(),
    goals: z.array(z.string()).optional(),
    engine: z.string().optional()
  }).optional()
});
export type AnalyticsEvent = z.infer<typeof AnalyticsEventZ>;

export const AnalyticsIngestZ = z.object({
  events: z.array(AnalyticsEventZ).min(1)
});
export type AnalyticsIngest = z.infer<typeof AnalyticsIngestZ>;

export const AnalyticsAggregateQueryZ = z.object({
  from: z.string().optional(),
  to: z.string().optional()
});
export type AnalyticsAggregateQuery = z.infer<typeof AnalyticsAggregateQueryZ>;

export const AnalyticsAggregateZ = z.object({
  totals: z.object({
    by_event: z.record(z.number()),
    by_day: z.array(z.object({ day: z.string(), count: z.number() })),
    engines: z.record(z.number()).optional(),
    topics: z.record(z.number()).optional()
  })
});
export type AnalyticsAggregate = z.infer<typeof AnalyticsAggregateZ>;
