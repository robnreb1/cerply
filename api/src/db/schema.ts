/* Drizzle schema (CommonJS-friendly) */
import { pgTable, uuid, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';

// Organizations: enterprise customers
export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  domain: text('domain').unique(),
  ssoConfig: jsonb('sso_config'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Users: now belong to an organization
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  organizationId: uuid('organization_id').references(() => organizations.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
});

// User roles: RBAC (admin, manager, learner)
export const userRoles = pgTable('user_roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  role: text('role').notNull(), // 'admin' | 'manager' | 'learner'
  grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
  grantedBy: uuid('granted_by').references(() => users.id),
});

// SSO sessions
export const ssoSessions = pgTable('sso_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  provider: text('provider').notNull(),
  providerId: text('provider_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

// Teams: managers create teams
export const teams = pgTable('teams', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  managerId: uuid('manager_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Team members
export const teamMembers = pgTable('team_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
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

