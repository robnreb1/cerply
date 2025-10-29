import { pgTable, text, jsonb, timestamp, uuid, integer, boolean, foreignKey, index, unique, check } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

/**
 * Cerply V2 Database Schema
 * 
 * This schema implements the Module-centric model from BRD v2.0 and FSD v2.0.
 * 
 * Core concepts:
 * - Module: Deep, comprehensive content body on one topic (the source of truth)
 * - Module core: The content inside a Module (sections, key points, sources)
 * - Module assignment: Manager assigns Module to specific audience with delivery rules
 * - Content Library: Client's private repository for Company Modules
 * - Certified Core: Expert-stamped Module core in Cerply catalogue (read-only for clients)
 */

// ============================================================================
// MODULES & CONTENT
// ============================================================================

/**
 * modules - The comprehensive body of content on one topic (Module / Topic Module / Opus)
 * This is the source of truth from which all delivery items are generated.
 */
export const modules = pgTable("modules", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  title: text().notNull(),
  goals: jsonb().notNull(), // Array of learning goals/outcomes
  targetRoles: jsonb("target_roles").notNull(), // Array of target roles (e.g., ["new-analyst", "manager"])
  tags: jsonb().notNull(), // Array of tags (skill, sector, etc.)
  sector: text(), // e.g., "financial-services", "healthcare"
  version: integer().default(1).notNull(),
  ownerId: uuid("owner_id").notNull(), // User who owns this module
  organizationId: uuid("organization_id").notNull(), // Organization that owns this
  visibility: text().notNull(), // "private", "company", "certified"
  complianceCritical: boolean("compliance_critical").default(false).notNull(), // Allows exact repeats
  lockedAt: timestamp("locked_at", { withTimezone: true, mode: 'string' }), // When locked (immutable version created)
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("idx_modules_org").using("btree", table.organizationId.asc().nullsLast()),
  index("idx_modules_owner").using("btree", table.ownerId.asc().nullsLast()),
  index("idx_modules_visibility").using("btree", table.visibility.asc().nullsLast()),
  check("modules_visibility_check", sql`visibility IN ('private', 'company', 'certified')`),
])

/**
 * module_sections - Sections within a Module core (the structured content)
 * Each section has content, source citations, and provenance badges.
 */
export const moduleSections = pgTable("module_sections", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  moduleId: uuid("module_id").notNull(),
  title: text().notNull(),
  content: text().notNull(), // Main content (markdown supported)
  order: integer().notNull(), // Display order within module
  sourceMap: jsonb("source_map").notNull(), // { citations: [{ url, title, excerpt }], ... }
  provenanceBadges: jsonb("provenance_badges").notNull(), // { type: "Internal" | "Certified Core" | "Industry source" | "Cerply templates" }
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("idx_module_sections_module").using("btree", table.moduleId.asc().nullsLast()),
  foreignKey({
    columns: [table.moduleId],
    foreignColumns: [modules.id],
    name: "module_sections_module_id_fkey"
  }).onDelete("cascade"),
])

/**
 * module_items - Generated delivery items (micro-lessons, quick checks, quizzes, guidance notes)
 * These are derived from the Module core and vary per delivery.
 */
export const moduleItems = pgTable("module_items", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  moduleId: uuid("module_id").notNull(),
  sectionId: uuid("section_id"), // Optional link to specific section
  itemType: text("item_type").notNull(), // "micro-lesson", "quick-check", "quiz", "guidance-note"
  content: jsonb().notNull(), // Item content (question, choices, explanation, etc.)
  difficultyLevel: integer("difficulty_level").notNull(), // 0-10 scale
  goalTags: jsonb("goal_tags").notNull(), // Array of goal IDs this item addresses
  moduleVersionRef: integer("module_version_ref").notNull(), // Which module version this was generated from
  provenance: jsonb().notNull(), // { sources: [...], generatedBy: "model-x", timestamp: ... }
  generatedAt: timestamp("generated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("idx_module_items_module").using("btree", table.moduleId.asc().nullsLast()),
  index("idx_module_items_section").using("btree", table.sectionId.asc().nullsLast()),
  index("idx_module_items_type").using("btree", table.itemType.asc().nullsLast()),
  foreignKey({
    columns: [table.moduleId],
    foreignColumns: [modules.id],
    name: "module_items_module_id_fkey"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.sectionId],
    foreignColumns: [moduleSections.id],
    name: "module_items_section_id_fkey"
  }).onDelete("set null"),
  check("module_items_type_check", sql`item_type IN ('micro-lesson', 'quick-check', 'quiz', 'guidance-note')`),
  check("module_items_difficulty_check", sql`difficulty_level >= 0 AND difficulty_level <= 10`),
])

// ============================================================================
// MODULE ASSIGNMENTS (PUSH)
// ============================================================================

/**
 * module_assignments - Manager assigns Module to audience with delivery rules
 * This is what learners receive (the "Push" flow in BRD).
 */
export const moduleAssignments = pgTable("module_assignments", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  moduleId: uuid("module_id").notNull(),
  organizationId: uuid("organization_id").notNull(),
  createdByUserId: uuid("created_by_user_id").notNull(),
  audience: jsonb().notNull(), // { teams: [uuid], groups: [uuid], people: [uuid] }
  mandatory: boolean().default(false).notNull(), // true = mandatory, false = recommended
  startDate: timestamp("start_date", { withTimezone: true, mode: 'string' }),
  quietHoursStart: text("quiet_hours_start").default("20:00").notNull(), // HH:MM format
  quietHoursEnd: text("quiet_hours_end").default("08:00").notNull(), // HH:MM format
  dailyCap: integer("daily_cap").default(2).notNull(), // Max mandatory items per day
  status: text().default("active").notNull(), // "active", "paused", "completed"
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("idx_module_assignments_module").using("btree", table.moduleId.asc().nullsLast()),
  index("idx_module_assignments_org").using("btree", table.organizationId.asc().nullsLast()),
  index("idx_module_assignments_creator").using("btree", table.createdByUserId.asc().nullsLast()),
  index("idx_module_assignments_status").using("btree", table.status.asc().nullsLast()),
  foreignKey({
    columns: [table.moduleId],
    foreignColumns: [modules.id],
    name: "module_assignments_module_id_fkey"
  }).onDelete("cascade"),
  check("module_assignments_status_check", sql`status IN ('active', 'paused', 'completed')`),
])

// ============================================================================
// CONTENT LIBRARY & CERTIFIED
// ============================================================================

/**
 * content_library - Client's private repository for Company Modules
 * Tracks locked modules and their lock type.
 */
export const contentLibrary = pgTable("content_library", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  organizationId: uuid("organization_id").notNull(),
  moduleId: uuid("module_id").notNull(),
  locked: boolean().default(false).notNull(),
  lockType: text("lock_type"), // "company_module", "certified_candidate", "certified_core"
  approvedBy: uuid("approved_by"), // User who approved lock
  approvedAt: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("idx_content_library_org").using("btree", table.organizationId.asc().nullsLast()),
  index("idx_content_library_module").using("btree", table.moduleId.asc().nullsLast()),
  unique("content_library_org_module_key").on(table.organizationId, table.moduleId),
  foreignKey({
    columns: [table.moduleId],
    foreignColumns: [modules.id],
    name: "content_library_module_id_fkey"
  }).onDelete("cascade"),
  check("content_library_lock_type_check", sql`lock_type IN ('company_module', 'certified_candidate', 'certified_core') OR lock_type IS NULL`),
])

/**
 * certified_submissions - Modules submitted for Certified review
 * Tracks the review and stamp workflow.
 */
export const certifiedSubmissions = pgTable("certified_submissions", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  moduleId: uuid("module_id").notNull(),
  submittedBy: uuid("submitted_by").notNull(),
  status: text().default("pending").notNull(), // "pending", "approved", "rejected"
  reviewerId: uuid("reviewer_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
  stampData: jsonb("stamp_data"), // { expertName, profile, tags, sector, level, notes }
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("idx_certified_submissions_module").using("btree", table.moduleId.asc().nullsLast()),
  index("idx_certified_submissions_submitter").using("btree", table.submittedBy.asc().nullsLast()),
  index("idx_certified_submissions_status").using("btree", table.status.asc().nullsLast()),
  foreignKey({
    columns: [table.moduleId],
    foreignColumns: [modules.id],
    name: "certified_submissions_module_id_fkey"
  }).onDelete("cascade"),
  check("certified_submissions_status_check", sql`status IN ('pending', 'approved', 'rejected')`),
])

// ============================================================================
// BUILD WORKSPACE
// ============================================================================

/**
 * build_sessions - Tracks Build workspace sessions (Chat pane history)
 * Stores the conversation and agent plans during module creation.
 */
export const buildSessions = pgTable("build_sessions", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  userId: uuid("user_id").notNull(),
  moduleId: uuid("module_id"),
  chatHistory: jsonb("chat_history").default([]).notNull(), // Array of { role, content, timestamp }
  agentPlans: jsonb("agent_plans").default([]).notNull(), // Array of proposed plans
  sourcesUsed: jsonb("sources_used").default([]).notNull(), // Array of { type, url, name, timestamp }
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("idx_build_sessions_user").using("btree", table.userId.asc().nullsLast()),
  index("idx_build_sessions_module").using("btree", table.moduleId.asc().nullsLast()),
  foreignKey({
    columns: [table.moduleId],
    foreignColumns: [modules.id],
    name: "build_sessions_module_id_fkey"
  }).onDelete("cascade"),
])

// ============================================================================
// LEARNER PROGRESS & RESPONSES
// ============================================================================

/**
 * learner_progress - Tracks each learner's progress through Module assignments
 * Stores current level, phase, streak, and weak areas.
 */
export const learnerProgress = pgTable("learner_progress", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  userId: uuid("user_id").notNull(),
  moduleAssignmentId: uuid("module_assignment_id").notNull(),
  currentLevel: integer("current_level").default(0).notNull(), // 0-10 scale
  phase: text().default("beginner").notNull(), // "beginner", "intermediate", "advanced", "expert"
  streakDays: integer("streak_days").default(0).notNull(),
  lastSessionAt: timestamp("last_session_at", { withTimezone: true, mode: 'string' }),
  weakAreas: jsonb("weak_areas").default([]).notNull(), // Array of { goalId, difficulty, lastAttempt }
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("idx_learner_progress_user").using("btree", table.userId.asc().nullsLast()),
  index("idx_learner_progress_assignment").using("btree", table.moduleAssignmentId.asc().nullsLast()),
  unique("learner_progress_user_assignment_key").on(table.userId, table.moduleAssignmentId),
  foreignKey({
    columns: [table.moduleAssignmentId],
    foreignColumns: [moduleAssignments.id],
    name: "learner_progress_assignment_id_fkey"
  }).onDelete("cascade"),
  check("learner_progress_level_check", sql`current_level >= 0 AND current_level <= 10`),
  check("learner_progress_phase_check", sql`phase IN ('beginner', 'intermediate', 'advanced', 'expert')`),
])

/**
 * learner_responses - Individual responses to module items
 * Captures answer, correctness, time, hints, confidence for adaptive engine.
 */
export const learnerResponses = pgTable("learner_responses", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  userId: uuid("user_id").notNull(),
  moduleItemId: uuid("module_item_id").notNull(),
  response: jsonb().notNull(), // The learner's answer (format depends on item type)
  correct: boolean(), // null = not applicable (e.g., reflection item)
  answerTimeMs: integer("answer_time_ms"), // Time to answer in milliseconds
  hintsUsed: integer("hints_used").default(0).notNull(),
  confidence: text(), // "high", "medium", "low" (if asked)
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("idx_learner_responses_user").using("btree", table.userId.asc().nullsLast()),
  index("idx_learner_responses_item").using("btree", table.moduleItemId.asc().nullsLast()),
  index("idx_learner_responses_created").using("btree", table.createdAt.desc().nullsFirst()),
  foreignKey({
    columns: [table.moduleItemId],
    foreignColumns: [moduleItems.id],
    name: "learner_responses_item_id_fkey"
  }).onDelete("cascade"),
  check("learner_responses_confidence_check", sql`confidence IN ('high', 'medium', 'low') OR confidence IS NULL`),
])

// ============================================================================
// OBSERVABILITY & AUDIT
// ============================================================================

/**
 * model_logs - Tracks all model usage for cost and performance monitoring
 * Logs every model call with label, tokens, cost, duration.
 */
export const modelLogs = pgTable("model_logs", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  jobType: text("job_type").notNull(), // "draft_core", "quality_check", "chat", "generate_items", etc.
  modelLabel: text("model_label").notNull(), // e.g., "gpt-5-pro", "claude-sonnet-4.5", "gpt-5-mini"
  tokens: integer(), // Total tokens (input + output)
  costCents: integer("cost_cents"), // Estimated cost in cents
  durationMs: integer("duration_ms"), // Duration in milliseconds
  metadata: jsonb().default({}).notNull(), // Additional context (module_id, user_id, etc.)
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("idx_model_logs_job_type").using("btree", table.jobType.asc().nullsLast()),
  index("idx_model_logs_model").using("btree", table.modelLabel.asc().nullsLast()),
  index("idx_model_logs_created").using("btree", table.createdAt.desc().nullsFirst()),
])

/**
 * audit_events - Tracks important actions for compliance and security
 * Logs locks, pushes, wraps, stamps, exports, takedowns, and setting changes.
 */
export const auditEvents = pgTable("audit_events", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  userId: uuid("user_id").notNull(),
  organizationId: uuid("organization_id").notNull(),
  eventType: text("event_type").notNull(), // "lock", "push", "wrap", "stamp", "export", "takedown", "setting_change", "approval"
  entityType: text("entity_type").notNull(), // "module", "assignment", "submission", "setting"
  entityId: uuid("entity_id").notNull(),
  metadata: jsonb().default({}).notNull(), // Event-specific data
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index("idx_audit_events_user").using("btree", table.userId.asc().nullsLast()),
  index("idx_audit_events_org").using("btree", table.organizationId.asc().nullsLast()),
  index("idx_audit_events_type").using("btree", table.eventType.asc().nullsLast()),
  index("idx_audit_events_created").using("btree", table.createdAt.desc().nullsFirst()),
])

