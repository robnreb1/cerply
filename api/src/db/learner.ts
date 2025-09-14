/* Minimal Drizzle tables for Attempts and ReviewSchedule (no extras) */
import { pgTable, text, uuid, boolean, integer, timestamp, real } from 'drizzle-orm/pg-core';

export const attempts = pgTable('attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  itemId: text('item_id').notNull(),
  answerIndex: integer('answer_index'),
  correct: boolean('correct').notNull(),
  timeMs: integer('time_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const reviewSchedule = pgTable('review_schedule', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  itemId: text('item_id').notNull(),
  nextAt: timestamp('next_at', { withTimezone: true }).notNull(),
  strengthScore: real('strength_score').notNull().default(0.3),
});

