/* Drizzle schema (CommonJS-friendly) */
import { pgTable, uuid, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
});

export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  brief: text('brief').notNull(),
  status: text('status').default('draft').notNull(), // draft|active|archived
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const modules = pgTable('modules', {
  id: uuid('id').defaultRandom().primaryKey(),
  planId: uuid('plan_id').references(() => plans.id).notNull(),
  title: text('title').notNull(),
  order: integer('order').notNull(),
});

export const items = pgTable('items', {
  id: uuid('id').defaultRandom().primaryKey(),
  moduleId: uuid('module_id').references(() => modules.id).notNull(),
  type: text('type').notNull(), // explainer|mcq|free
  stem: text('stem'),
  options: jsonb('options'),
  answer: integer('answer'),
  explainer: text('explainer'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const attempts = pgTable('attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  itemId: uuid('item_id').references(() => items.id).notNull(),
  answerIndex: integer('answer_index'),
  correct: integer('correct').notNull(), // 0/1
  timeMs: integer('time_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const reviewSchedule = pgTable('review_schedule', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  itemId: uuid('item_id').references(() => items.id).notNull(),
  nextAt: timestamp('next_at', { withTimezone: true }).notNull(),
  strengthScore: integer('strength_score').notNull(), // 0..1000 (int form of [0,1])
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

