------------------------------------------------------------------------------
import { pgTable, text, uuid, boolean, integer, timestamp, real, uniqueIndex } from 'drizzle-orm/pg-core';

export const attempts = pgTable('attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  itemId: text('item_id').notNull(),
  answerIndex: integer('answer_index'),
  correct: boolean('correct').notNull(),
  timeMs: integer('time_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const reviewSchedule = pgTable('review_schedule', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  itemId: text('item_id').notNull(),
  nextAt: timestamp('next_at', { withTimezone: true }).notNull(),
  strengthScore: real('strength_score').notNull().default(0.3)
}, (t) => ({
  uqUserItem: uniqueIndex('uq_review_user_item').on(t.userId, t.itemId),
}));
------------------------------------------------------------------------------

