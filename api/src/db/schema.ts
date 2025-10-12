/* Drizzle schema (CommonJS-friendly) */
import { pgTable, uuid, text, integer, timestamp, jsonb, boolean, numeric, date, unique } from 'drizzle-orm/pg-core';

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

// Tracks: learning tracks (canonical = org_id NULL, org-specific = org_id NOT NULL)
export const tracks = pgTable('tracks', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id),
  title: text('title').notNull(),
  planRef: text('plan_ref').notNull(), // e.g., 'canon:arch-std-v1' or 'plan:uuid'
  certifiedArtifactId: uuid('certified_artifact_id'), // references certified_artifacts if applicable
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Team track subscriptions: teams subscribe to tracks with cadence
export const teamTrackSubscriptions = pgTable('team_track_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  trackId: uuid('track_id').notNull().references(() => tracks.id),
  cadence: text('cadence').notNull(), // 'daily' | 'weekly' | 'monthly'
  startAt: timestamp('start_at', { withTimezone: true }).defaultNow().notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
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
  channel: text('channel').default('web'), // Epic 5: Delivery channel
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

// Epic 4: Manager Dashboard - Analytics & Insights

// Team analytics snapshots: aggregated metrics computed nightly or on-demand
export const teamAnalyticsSnapshots = pgTable('team_analytics_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  trackId: uuid('track_id').references(() => tracks.id),
  snapshotDate: date('snapshot_date').notNull(),
  activeLearners: integer('active_learners').notNull().default(0),
  totalAttempts: integer('total_attempts').notNull().default(0),
  correctAttempts: integer('correct_attempts').notNull().default(0),
  avgComprehension: numeric('avg_comprehension', { precision: 5, scale: 3 }),
  avgLatencyMs: integer('avg_latency_ms'),
  atRiskCount: integer('at_risk_count').notNull().default(0),
  completionRate: numeric('completion_rate', { precision: 5, scale: 3 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Learner-level analytics: for at-risk identification
export const learnerAnalytics = pgTable('learner_analytics', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  trackId: uuid('track_id').references(() => tracks.id),
  totalAttempts: integer('total_attempts').notNull().default(0),
  correctAttempts: integer('correct_attempts').notNull().default(0),
  comprehensionRate: numeric('comprehension_rate', { precision: 5, scale: 3 }),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  nextReviewAt: timestamp('next_review_at', { withTimezone: true }),
  overdueReviews: integer('overdue_reviews').notNull().default(0),
  isAtRisk: boolean('is_at_risk').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Retention curves: spaced repetition effectiveness
export const retentionCurves = pgTable('retention_curves', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  trackId: uuid('track_id').references(() => tracks.id),
  dayOffset: integer('day_offset').notNull(),
  retentionRate: numeric('retention_rate', { precision: 5, scale: 3 }),
  sampleSize: integer('sample_size').notNull(),
  snapshotDate: date('snapshot_date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Analytics configuration: org-level thresholds
export const analyticsConfig = pgTable('analytics_config', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  atRiskMinComprehension: numeric('at_risk_min_comprehension', { precision: 5, scale: 3 }).notNull().default('0.700'),
  atRiskMaxOverdue: integer('at_risk_max_overdue').notNull().default(5),
  cacheTtlMinutes: integer('cache_ttl_minutes').notNull().default(60),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Epic 5: Slack Channel Integration
export const channels = pgTable('channels', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'slack' | 'whatsapp' | 'teams' | 'email'
  config: jsonb('config').notNull(), // { slack_team_id, slack_bot_token, slack_signing_secret }
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userChannels = pgTable('user_channels', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  channelType: text('channel_type').notNull(), // 'slack' | 'whatsapp' | 'teams' | 'email'
  channelId: text('channel_id').notNull(), // Slack user ID, phone number, etc.
  preferences: jsonb('preferences'), // { quiet_hours, timezone, paused }
  verified: boolean('verified').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Epic 6: Ensemble Content Generation
export const contentGenerations = pgTable('content_generations', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  managerId: uuid('manager_id').notNull().references(() => users.id),
  artefactText: text('artefact_text').notNull(),
  understanding: text('understanding'),
  understandingApproved: boolean('understanding_approved').default(false),
  refinementIterations: integer('refinement_iterations').default(0),
  status: text('status').notNull().default('pending'),
  contentType: text('content_type'), // 'generic' | 'proprietary' | 'mixed'
  inputType: text('input_type').default('source'), // 'source' | 'topic'
  generatorAOutput: jsonb('generator_a_output'),
  generatorBOutput: jsonb('generator_b_output'),
  factCheckerOutput: jsonb('fact_checker_output'),
  totalCostUsd: numeric('total_cost_usd', { precision: 10, scale: 4 }),
  totalTokens: integer('total_tokens'),
  generationTimeMs: integer('generation_time_ms'),
  ethicalFlags: jsonb('ethical_flags').default('[]'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const contentRefinements = pgTable('content_refinements', {
  id: uuid('id').defaultRandom().primaryKey(),
  generationId: uuid('generation_id').notNull().references(() => contentGenerations.id, { onDelete: 'cascade' }),
  iteration: integer('iteration').notNull(),
  managerFeedback: text('manager_feedback').notNull(),
  llmResponse: text('llm_response').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const contentProvenance = pgTable('content_provenance', {
  id: uuid('id').defaultRandom().primaryKey(),
  generationId: uuid('generation_id').notNull().references(() => contentGenerations.id, { onDelete: 'cascade' }),
  moduleId: text('module_id').notNull(),
  sectionType: text('section_type').notNull(),
  sourceLlm: text('source_llm').notNull(),
  sourceModel: text('source_model').notNull(),
  confidenceScore: numeric('confidence_score', { precision: 3, scale: 2 }),
  selectedBy: text('selected_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Epic 6.5: Research Mode Citations
export const citations = pgTable('citations', {
  id: uuid('id').defaultRandom().primaryKey(),
  generationId: uuid('generation_id').notNull().references(() => contentGenerations.id, { onDelete: 'cascade' }),
  citationText: text('citation_text').notNull(),
  title: text('title'),
  author: text('author'),
  sourceType: text('source_type'), // textbook, paper, course, video, website
  url: text('url'),
  relevance: text('relevance'),
  validationStatus: text('validation_status'), // verified, questionable, unverified
  confidenceScore: numeric('confidence_score', { precision: 3, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Epic 7: Gamification & Certification System
export const learnerLevels = pgTable('learner_levels', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  trackId: uuid('track_id').notNull().references(() => tracks.id, { onDelete: 'cascade' }),
  level: text('level').notNull(), // 'novice' | 'learner' | 'practitioner' | 'expert' | 'master'
  correctAttempts: integer('correct_attempts').notNull().default(0),
  leveledUpAt: timestamp('leveled_up_at', { withTimezone: true }).defaultNow().notNull(),
});

export const certificates = pgTable('certificates', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  trackId: uuid('track_id').notNull().references(() => tracks.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
  signature: text('signature').notNull(), // Ed25519 signature (hex)
  pdfUrl: text('pdf_url'),
  verificationUrl: text('verification_url'),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  revocationReason: text('revocation_reason'),
});

export const badges = pgTable('badges', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  icon: text('icon').notNull(),
  criteria: jsonb('criteria').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const learnerBadges = pgTable('learner_badges', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  badgeId: uuid('badge_id').notNull().references(() => badges.id, { onDelete: 'cascade' }),
  earnedAt: timestamp('earned_at', { withTimezone: true }).defaultNow().notNull(),
});

export const managerNotifications = pgTable('manager_notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  managerId: uuid('manager_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  learnerId: uuid('learner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'level_up' | 'certificate' | 'badge' | 'at_risk'
  content: jsonb('content').notNull(),
  read: boolean('read').notNull().default(false),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
});

export const idempotencyKeys = pgTable('idempotency_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull(),
  route: text('route').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  statusCode: integer('status_code').notNull(),
  responseHash: text('response_hash').notNull(),
  responseBody: jsonb('response_body').notNull(),
  responseHeaders: jsonb('response_headers'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const auditEvents = pgTable('audit_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventType: text('event_type').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  performedBy: uuid('performed_by').references(() => users.id, { onDelete: 'set null' }),
  requestId: text('request_id'),
  metadata: jsonb('metadata'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

