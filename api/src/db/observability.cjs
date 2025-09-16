/* Drizzle models for events & gen_ledger (pure CommonJS) */
const { pgTable, uuid, text, integer, timestamp, jsonb } = require('drizzle-orm/pg-core');

const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id'),
  type: text('type').notNull(),
  payload: jsonb('payload'),
  ts: timestamp('ts', { withTimezone: true }).defaultNow().notNull(),
});

const genLedger = pgTable('gen_ledger', {
  id: uuid('id').defaultRandom().primaryKey(),
  itemId: text('item_id'),
  modelUsed: text('model_used').notNull(),
  costCents: integer('cost_cents').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

module.exports = { events, genLedger };


