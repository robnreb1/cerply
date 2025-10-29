-- Cerply V2 Pivot Schema Migration
-- Date: 2025-10-29
-- Purpose: Fresh schema for Module-centric model (BRD v2.0, FSD v2.0)

-- This migration creates new tables for the V2 pivot while keeping existing
-- auth/org infrastructure (users, organizations, user_roles, teams, team_members)

-- ============================================================================
-- MODULES & CONTENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  goals JSONB NOT NULL DEFAULT '[]',
  target_roles JSONB NOT NULL DEFAULT '[]',
  tags JSONB NOT NULL DEFAULT '[]',
  sector TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  owner_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('private', 'company', 'certified')),
  compliance_critical BOOLEAN NOT NULL DEFAULT FALSE,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_modules_org ON modules(organization_id);
CREATE INDEX idx_modules_owner ON modules(owner_id);
CREATE INDEX idx_modules_visibility ON modules(visibility);

COMMENT ON TABLE modules IS 'Comprehensive content body on one topic (Module / Topic Module / Opus) - the source of truth';
COMMENT ON COLUMN modules.goals IS 'Array of learning goals/outcomes';
COMMENT ON COLUMN modules.target_roles IS 'Array of target roles (e.g., ["new-analyst", "manager"])';
COMMENT ON COLUMN modules.tags IS 'Array of tags (skill, sector, etc.)';
COMMENT ON COLUMN modules.compliance_critical IS 'When true, allows exact repeats for regulatory/mandatory content';
COMMENT ON COLUMN modules.locked_at IS 'When locked, creates an immutable version';

-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS module_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  source_map JSONB NOT NULL DEFAULT '{"citations": []}',
  provenance_badges JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_module_sections_module ON module_sections(module_id);

COMMENT ON TABLE module_sections IS 'Sections within a Module core with content, citations, and provenance';
COMMENT ON COLUMN module_sections.source_map IS 'Citations: {citations: [{url, title, excerpt}, ...]}';
COMMENT ON COLUMN module_sections.provenance_badges IS 'Array of {type: "Internal"|"Certified Core"|"Industry source"|"Cerply templates"}';

-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS module_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  section_id UUID REFERENCES module_sections(id) ON DELETE SET NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('micro-lesson', 'quick-check', 'quiz', 'guidance-note')),
  content JSONB NOT NULL DEFAULT '{}',
  difficulty_level INTEGER NOT NULL CHECK (difficulty_level >= 0 AND difficulty_level <= 10),
  goal_tags JSONB NOT NULL DEFAULT '[]',
  module_version_ref INTEGER NOT NULL,
  provenance JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_module_items_module ON module_items(module_id);
CREATE INDEX idx_module_items_section ON module_items(section_id);
CREATE INDEX idx_module_items_type ON module_items(item_type);

COMMENT ON TABLE module_items IS 'Generated delivery items (micro-lessons, quick checks, quizzes, guidance notes) derived from Module core';
COMMENT ON COLUMN module_items.content IS 'Item content (question, choices, explanation, etc.) - format depends on item_type';
COMMENT ON COLUMN module_items.difficulty_level IS '0-10 scale for adaptive engine';
COMMENT ON COLUMN module_items.goal_tags IS 'Array of goal IDs this item addresses';
COMMENT ON COLUMN module_items.module_version_ref IS 'Which module version this was generated from';
COMMENT ON COLUMN module_items.provenance IS 'Sources, generatedBy model, timestamp, etc.';

-- ============================================================================
-- MODULE ASSIGNMENTS (PUSH)
-- ============================================================================

CREATE TABLE IF NOT EXISTS module_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  created_by_user_id UUID NOT NULL,
  audience JSONB NOT NULL DEFAULT '{"teams": [], "groups": [], "people": []}',
  mandatory BOOLEAN NOT NULL DEFAULT FALSE,
  start_date TIMESTAMPTZ,
  quiet_hours_start TEXT NOT NULL DEFAULT '20:00',
  quiet_hours_end TEXT NOT NULL DEFAULT '08:00',
  daily_cap INTEGER NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_module_assignments_module ON module_assignments(module_id);
CREATE INDEX idx_module_assignments_org ON module_assignments(organization_id);
CREATE INDEX idx_module_assignments_creator ON module_assignments(created_by_user_id);
CREATE INDEX idx_module_assignments_status ON module_assignments(status);

COMMENT ON TABLE module_assignments IS 'Manager assigns Module to audience with delivery rules (the "Push" flow)';
COMMENT ON COLUMN module_assignments.audience IS 'JSON: {teams: [uuid], groups: [uuid], people: [uuid]}';
COMMENT ON COLUMN module_assignments.mandatory IS 'true = mandatory (counts toward daily cap), false = recommended';
COMMENT ON COLUMN module_assignments.quiet_hours_start IS 'HH:MM format, timezone-adaptive per learner';
COMMENT ON COLUMN module_assignments.daily_cap IS 'Max mandatory items per day';

-- ============================================================================
-- CONTENT LIBRARY & CERTIFIED
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  lock_type TEXT CHECK (lock_type IN ('company_module', 'certified_candidate', 'certified_core')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, module_id)
);

CREATE INDEX idx_content_library_org ON content_library(organization_id);
CREATE INDEX idx_content_library_module ON content_library(module_id);

COMMENT ON TABLE content_library IS 'Client''s private repository for Company Modules';
COMMENT ON COLUMN content_library.lock_type IS 'company_module = client-owned, certified_candidate = submitted for review, certified_core = approved & stamped';

-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS certified_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_id UUID,
  reviewed_at TIMESTAMPTZ,
  stamp_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_certified_submissions_module ON certified_submissions(module_id);
CREATE INDEX idx_certified_submissions_submitter ON certified_submissions(submitted_by);
CREATE INDEX idx_certified_submissions_status ON certified_submissions(status);

COMMENT ON TABLE certified_submissions IS 'Modules submitted for Certified review and stamp';
COMMENT ON COLUMN certified_submissions.stamp_data IS 'JSON: {expertName, profile, tags, sector, level, notes}';

-- ============================================================================
-- BUILD WORKSPACE
-- ============================================================================

CREATE TABLE IF NOT EXISTS build_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  chat_history JSONB NOT NULL DEFAULT '[]',
  agent_plans JSONB NOT NULL DEFAULT '[]',
  sources_used JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_build_sessions_user ON build_sessions(user_id);
CREATE INDEX idx_build_sessions_module ON build_sessions(module_id);

COMMENT ON TABLE build_sessions IS 'Build workspace sessions - Chat pane history and agent plans';
COMMENT ON COLUMN build_sessions.chat_history IS 'Array of {role, content, timestamp}';
COMMENT ON COLUMN build_sessions.agent_plans IS 'Array of proposed plans';
COMMENT ON COLUMN build_sessions.sources_used IS 'Array of {type, url, name, timestamp}';

-- ============================================================================
-- LEARNER PROGRESS & RESPONSES
-- ============================================================================

CREATE TABLE IF NOT EXISTS learner_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  module_assignment_id UUID NOT NULL REFERENCES module_assignments(id) ON DELETE CASCADE,
  current_level INTEGER NOT NULL DEFAULT 0 CHECK (current_level >= 0 AND current_level <= 10),
  phase TEXT NOT NULL DEFAULT 'beginner' CHECK (phase IN ('beginner', 'intermediate', 'advanced', 'expert')),
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_session_at TIMESTAMPTZ,
  weak_areas JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, module_assignment_id)
);

CREATE INDEX idx_learner_progress_user ON learner_progress(user_id);
CREATE INDEX idx_learner_progress_assignment ON learner_progress(module_assignment_id);

COMMENT ON TABLE learner_progress IS 'Tracks each learner''s progress through Module assignments';
COMMENT ON COLUMN learner_progress.current_level IS '0-10 scale: 0-3 Beginner, 4-6 Intermediate, 7-9 Advanced, 10 Expert';
COMMENT ON COLUMN learner_progress.weak_areas IS 'Array of {goalId, difficulty, lastAttempt}';

-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS learner_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  module_item_id UUID NOT NULL REFERENCES module_items(id) ON DELETE CASCADE,
  response JSONB NOT NULL,
  correct BOOLEAN,
  answer_time_ms INTEGER,
  hints_used INTEGER NOT NULL DEFAULT 0,
  confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_learner_responses_user ON learner_responses(user_id);
CREATE INDEX idx_learner_responses_item ON learner_responses(module_item_id);
CREATE INDEX idx_learner_responses_created ON learner_responses(created_at DESC);

COMMENT ON TABLE learner_responses IS 'Individual responses to module items for adaptive engine';
COMMENT ON COLUMN learner_responses.response IS 'The learner''s answer (format depends on item type)';
COMMENT ON COLUMN learner_responses.correct IS 'null = not applicable (e.g., reflection item)';

-- ============================================================================
-- OBSERVABILITY & AUDIT
-- ============================================================================

CREATE TABLE IF NOT EXISTS model_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  model_label TEXT NOT NULL,
  tokens INTEGER,
  cost_cents INTEGER,
  duration_ms INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_model_logs_job_type ON model_logs(job_type);
CREATE INDEX idx_model_logs_model ON model_logs(model_label);
CREATE INDEX idx_model_logs_created ON model_logs(created_at DESC);

COMMENT ON TABLE model_logs IS 'Tracks all model usage for cost and performance monitoring';
COMMENT ON COLUMN model_logs.job_type IS 'e.g., draft_core, quality_check, chat, generate_items';
COMMENT ON COLUMN model_logs.model_label IS 'e.g., gpt-5-pro, claude-sonnet-4.5, gpt-5-mini';
COMMENT ON COLUMN model_logs.metadata IS 'Additional context (module_id, user_id, etc.)';

-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_events_user ON audit_events(user_id);
CREATE INDEX idx_audit_events_org ON audit_events(organization_id);
CREATE INDEX idx_audit_events_type ON audit_events(event_type);
CREATE INDEX idx_audit_events_created ON audit_events(created_at DESC);

COMMENT ON TABLE audit_events IS 'Tracks important actions for compliance and security';
COMMENT ON COLUMN audit_events.event_type IS 'lock, push, wrap, stamp, export, takedown, setting_change, approval';
COMMENT ON COLUMN audit_events.entity_type IS 'module, assignment, submission, setting';
COMMENT ON COLUMN audit_events.metadata IS 'Event-specific data (what changed, from/to values, etc.)';

-- ============================================================================
-- GRANTS (assuming standard Cerply setup)
-- ============================================================================

-- Grant access to application user (adjust as needed for your setup)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO cerply_app;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO cerply_app;

