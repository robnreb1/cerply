------------------------------------------------------------------------------
/* Core entities for persistence uplift (Plan/Module/Item) */
import { pgTable, uuid, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id'),
  brief: text('brief').notNull(),
  status: text('status').notNull().default('draft'),
  slug: text('slug').unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const modules = pgTable('modules', {
  id: uuid('id').defaultRandom().primaryKey(),
  planId: uuid('plan_id').notNull(),
  title: text('title').notNull(),
  order: integer('order').notNull().default(1),
});

export const items = pgTable('items', {
  id: uuid('id').defaultRandom().primaryKey(),
  moduleId: uuid('module_id').notNull(),
  type: text('type').notNull(), // 'explainer'|'mcq'|'free'
  stem: text('stem'),
  options: jsonb('options'),
  answer: integer('answer'),
  explainer: text('explainer'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
------------------------------------------------------------------------------

