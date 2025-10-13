/* Drizzle schema (CommonJS-friendly) */
import { pgTable, uuid, text, integer, timestamp, jsonb, boolean, numeric, date, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

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
  answerText: text('answer_text'), // Epic 8: Free-text answers
  partialCredit: numeric('partial_credit', { precision: 3, scale: 2 }), // Epic 8: 0.00 to 1.00
  feedback: text('feedback'), // Epic 8: Validation feedback
  validationMethod: text('validation_method'), // Epic 8: 'mcq', 'fuzzy', 'llm'
  responseTimeMs: integer('response_time_ms'), // Epic 9: Response time for adaptive difficulty
  difficultyLevel: text('difficulty_level'), // Epic 9: 'recall' | 'application' | 'analysis' | 'synthesis'
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
  granularity: text('granularity'), // 'subject' | 'topic' | 'module' - THE KILLER FEATURE
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

// Epic 8: Conversational Learning Interface

// Chat sessions: tracks conversations for context and history
export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
});

// Chat messages: stores individual messages in conversations
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').notNull().references(() => chatSessions.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user' | 'assistant' | 'system'
  content: text('content').notNull(),
  intent: text('intent'), // 'progress' | 'next' | 'explanation' | 'filter' | 'help'
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Confusion tracking: logs when learners are confused for adaptive difficulty signals
export const confusionLog = pgTable('confusion_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  questionId: uuid('question_id').notNull(),
  query: text('query').notNull(),
  explanationProvided: text('explanation_provided').notNull(),
  helpful: boolean('helpful'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================================
// EPIC 9: ADAPTIVE DIFFICULTY ENGINE
// ============================================================================
// Migration: 018_adaptive_difficulty.sql
// Tracks learner profiles (learning style, consistency) and topic comprehension (mastery levels)

// Learner Profiles: Track learning style and performance consistency per user
export const learnerProfiles = pgTable('learner_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(), // TEXT to match users.id type
  learningStyle: text('learning_style'), // 'visual' | 'verbal' | 'kinesthetic' | 'balanced' | 'unknown'
  avgResponseTime: numeric('avg_response_time', { precision: 10, scale: 2 }), // milliseconds
  consistencyScore: numeric('consistency_score', { precision: 3, scale: 2 }), // 0.00 - 1.00
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqUserId: unique().on(table.userId),
}));

// Topic Comprehension: Track mastery level per user per topic for adaptive difficulty
export const topicComprehension = pgTable('topic_comprehension', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(), // TEXT to match users.id type
  topicId: uuid('topic_id').notNull(),  // Will reference topics.id once migration 016 is complete
  masteryLevel: numeric('mastery_level', { precision: 3, scale: 2 }).notNull().default('0.00'), // 0.00 - 1.00
  difficultyLevel: text('difficulty_level').notNull().default('recall'), // 'recall' | 'application' | 'analysis' | 'synthesis'
  attemptsCount: integer('attempts_count').notNull().default(0),
  correctCount: integer('correct_count').notNull().default(0),
  partialCreditSum: numeric('partial_credit_sum', { precision: 10, scale: 2 }).notNull().default('0.00'),
  confusionCount: integer('confusion_count').notNull().default(0),
  lastPracticedAt: timestamp('last_practiced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqUserTopic: unique().on(table.userId, table.topicId),
}));

// ============================================================================
// DEPRECATED TABLES (to be migrated to new hierarchy)
// ============================================================================
// NOTE: These tables are being replaced by the new Subject > Topic > Module > Quiz > Question hierarchy
// After migration (017_migrate_legacy_content.sql), these will be renamed to *_legacy
// - tracks → topics
// - modules → modules_v2
// - items → questions (within quizzes)
// - team_track_subscriptions → topic_assignments

// ============================================================================
// NEW CONTENT HIERARCHY (Epic 6/7/8 Scope Fix)
// ============================================================================
// Migration: 016_content_hierarchy.sql
// 5-tier structure: Subject > Topic > Module > Quiz > Question
// Topics are the collection unit (what we generate - 4-6 modules each)
// Modules are the provision unit (what learners consume)

// Subjects: Top-level knowledge domains
export const subjects = pgTable('subjects', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  icon: text('icon'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Topics: Content collection level (where we generate)
export const topics = pgTable('topics', {
  id: uuid('id').defaultRandom().primaryKey(),
  subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  
  // Certification
  isCertified: boolean('is_certified').notNull().default(false),
  certificationLevel: text('certification_level'), // 'topic' | 'module' | NULL
  certifiedBy: uuid('certified_by').references(() => users.id),
  certifiedAt: timestamp('certified_at', { withTimezone: true }),
  
  // Content metadata
  contentSource: text('content_source').notNull(), // 'research' | 'upload' | 'url' | 'prompt'
  isProprietary: boolean('is_proprietary').notNull().default(false),
  
  // Freshness management
  lastRefreshedAt: timestamp('last_refreshed_at', { withTimezone: true }).defaultNow().notNull(),
  refreshFrequencyMonths: integer('refresh_frequency_months').notNull().default(6),
  
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Modules v2: Content provision level (what learners consume)
export const modulesV2 = pgTable('modules_v2', {
  id: uuid('id').defaultRandom().primaryKey(),
  topicId: uuid('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  orderIndex: integer('order_index').notNull(),
  
  // Certification (can certify individual modules OR inherit from topic)
  isCertified: boolean('is_certified').notNull().default(false),
  certificationLevel: text('certification_level'), // 'topic' | 'module' | NULL
  
  // Provenance from 3-LLM ensemble
  provenance: jsonb('provenance'),
  
  estimatedDurationMinutes: integer('estimated_duration_minutes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Quizzes: Assessment containers (multiple questions)
export const quizzes = pgTable('quizzes', {
  id: uuid('id').defaultRandom().primaryKey(),
  moduleId: uuid('module_id').notNull().references(() => modulesV2.id, { onDelete: 'cascade' }),
  title: text('title'),
  orderIndex: integer('order_index').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Questions: Individual quiz items (replaces 'items')
export const questions = pgTable('questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  quizId: uuid('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'mcq' | 'free' | 'explainer'
  stem: text('stem').notNull(),
  options: jsonb('options'),
  correctAnswer: integer('correct_answer'),
  guidanceText: text('guidance_text'),
  difficultyLevel: text('difficulty_level'), // 'recall' | 'application' | 'analysis' | 'synthesis'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Topic assignments: Who is learning what (replaces team_track_subscriptions)
export const topicAssignments = pgTable('topic_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  topicId: uuid('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  
  // Assignment metadata
  isMandatory: boolean('is_mandatory').notNull().default(false),
  mandatoryUntil: timestamp('mandatory_until', { withTimezone: true }),
  assignedBy: uuid('assigned_by').references(() => users.id),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow().notNull(),
  
  // Status
  paused: boolean('paused').notNull().default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

// Topic citations: Sources for research-based content (Epic 6.5)
export const topicCitations = pgTable('topic_citations', {
  id: uuid('id').defaultRandom().primaryKey(),
  topicId: uuid('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  citationText: text('citation_text').notNull(),
  sourceUrl: text('source_url'),
  sourceType: text('source_type'), // 'textbook' | 'paper' | 'course' | 'documentation' | 'website'
  credibilityScore: numeric('credibility_score', { precision: 3, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Topic secondary sources: Company-specific context (Epic 6.8)
export const topicSecondarySources = pgTable('topic_secondary_sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  topicId: uuid('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  sourceType: text('source_type').notNull(), // 'url' | 'upload' | 'prompt'
  sourceUrl: text('source_url'),
  sourceFilePath: text('source_file_path'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Topic communications: Manager curation workflow (Epic 6.8)
export const topicCommunications = pgTable('topic_communications', {
  id: uuid('id').defaultRandom().primaryKey(),
  topicId: uuid('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  managerId: uuid('manager_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  draftMessage: text('draft_message'),
  finalMessage: text('final_message'),
  deliveryChannels: text('delivery_channels').array().notNull().default(sql`ARRAY[]::TEXT[]`),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

