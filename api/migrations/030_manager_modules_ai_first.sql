-- Migration 030: Manager Modules AI-First (Epic 14 v2.0)
-- Transforms module creation from form-based to conversational AI-first
-- Adds proficiency tracking, deadline management, and proprietary content ring-fencing

------------------------------------------------------------------------------
-- Step 1: Update manager_modules table for AI-first approach
------------------------------------------------------------------------------

-- Add conversational and mastery-focused columns
ALTER TABLE manager_modules ADD COLUMN IF NOT EXISTS target_mastery_level TEXT DEFAULT 'intermediate' 
  CHECK (target_mastery_level IN ('beginner', 'intermediate', 'advanced', 'expert', 'master'));

ALTER TABLE manager_modules ADD COLUMN IF NOT EXISTS starting_level TEXT 
  CHECK (starting_level IN ('beginner', 'intermediate', 'advanced'));

ALTER TABLE manager_modules ADD COLUMN IF NOT EXISTS content_generation_prompt TEXT;

ALTER TABLE manager_modules ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN manager_modules.target_mastery_level IS 'Target mastery level learners should achieve (Epic 14 v2.0) - defines end goal, not entry barrier';
COMMENT ON COLUMN manager_modules.starting_level IS 'Optional starting level (adaptive engine auto-detects if null)';
COMMENT ON COLUMN manager_modules.content_generation_prompt IS 'Original conversational prompt from manager';
COMMENT ON COLUMN manager_modules.paused_at IS 'Timestamp when module was paused (prevents new assignments/starts)';

------------------------------------------------------------------------------
-- Step 2: Update module_proprietary_content for ring-fencing
------------------------------------------------------------------------------

ALTER TABLE module_proprietary_content ADD COLUMN IF NOT EXISTS content_source TEXT DEFAULT 'proprietary' 
  CHECK (content_source IN ('proprietary', 'ai_generated', 'public_web'));

ALTER TABLE module_proprietary_content ADD COLUMN IF NOT EXISTS is_ring_fenced BOOLEAN DEFAULT true;

ALTER TABLE module_proprietary_content ADD COLUMN IF NOT EXISTS access_control TEXT DEFAULT 'org_only' 
  CHECK (access_control IN ('org_only', 'public'));

ALTER TABLE module_proprietary_content ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add index for access control queries
CREATE INDEX IF NOT EXISTS idx_module_proprietary_content_org_access ON module_proprietary_content(organization_id, access_control);

-- Add comments
COMMENT ON COLUMN module_proprietary_content.content_source IS 'Origin of content for provenance tracking (Epic 14 v2.0)';
COMMENT ON COLUMN module_proprietary_content.is_ring_fenced IS 'True if content must be firewalled from other orgs';
COMMENT ON COLUMN module_proprietary_content.access_control IS 'Access control policy: org_only (default) or public';
COMMENT ON COLUMN module_proprietary_content.organization_id IS 'Organization that owns this proprietary content';

------------------------------------------------------------------------------
-- Step 3: Update module_assignments for proficiency & deadline tracking
------------------------------------------------------------------------------

ALTER TABLE module_assignments ADD COLUMN IF NOT EXISTS target_proficiency_pct INTEGER DEFAULT 80 
  CHECK (target_proficiency_pct BETWEEN 50 AND 100);

ALTER TABLE module_assignments ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ;

ALTER TABLE module_assignments ADD COLUMN IF NOT EXISTS current_proficiency_pct INTEGER DEFAULT 0 
  CHECK (current_proficiency_pct BETWEEN 0 AND 100);

ALTER TABLE module_assignments ADD COLUMN IF NOT EXISTS risk_status TEXT DEFAULT 'on_track' 
  CHECK (risk_status IN ('on_track', 'at_risk', 'overdue', 'achieved'));

ALTER TABLE module_assignments ADD COLUMN IF NOT EXISTS last_proficiency_update TIMESTAMPTZ;

-- Add indexes for proficiency queries
CREATE INDEX IF NOT EXISTS idx_module_assignments_deadline ON module_assignments(deadline_at) 
  WHERE risk_status IN ('on_track', 'at_risk');

CREATE INDEX IF NOT EXISTS idx_module_assignments_risk ON module_assignments(risk_status, deadline_at);

CREATE INDEX IF NOT EXISTS idx_module_assignments_proficiency_update ON module_assignments(last_proficiency_update);

-- Add comments
COMMENT ON COLUMN module_assignments.target_proficiency_pct IS 'Target % proficiency at target difficulty level (Epic 14 v2.0)';
COMMENT ON COLUMN module_assignments.deadline_at IS 'Deadline for achieving target proficiency';
COMMENT ON COLUMN module_assignments.current_proficiency_pct IS 'Current proficiency % (auto-calculated from recent attempts)';
COMMENT ON COLUMN module_assignments.risk_status IS 'Risk status: on_track, at_risk (<7 days, <70% target), overdue, achieved';
COMMENT ON COLUMN module_assignments.last_proficiency_update IS 'Last time proficiency was calculated';

------------------------------------------------------------------------------
-- Step 4: Create module_creation_conversations table
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS module_creation_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES manager_modules(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_turns JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {role, content, timestamp, suggestions, modulePreview}
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_module_creation_conversations_module ON module_creation_conversations(module_id);
CREATE INDEX idx_module_creation_conversations_manager ON module_creation_conversations(manager_id);
CREATE INDEX idx_module_creation_conversations_status ON module_creation_conversations(status);

COMMENT ON TABLE module_creation_conversations IS 'Conversational history for AI-first module creation (Epic 14 v2.0)';
COMMENT ON COLUMN module_creation_conversations.conversation_turns IS 'Array of conversation turns with agent responses and user inputs';
COMMENT ON COLUMN module_creation_conversations.status IS 'Conversation status: active (ongoing), completed (module created), abandoned';

------------------------------------------------------------------------------
-- Step 5: Create proficiency_snapshots table for historical tracking
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS proficiency_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES module_assignments(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES manager_modules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  proficiency_pct INTEGER NOT NULL CHECK (proficiency_pct BETWEEN 0 AND 100),
  target_difficulty_level INTEGER NOT NULL CHECK (target_difficulty_level BETWEEN 1 AND 5),
  recent_attempts_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  incorrect_count INTEGER NOT NULL DEFAULT 0,
  risk_status TEXT NOT NULL CHECK (risk_status IN ('on_track', 'at_risk', 'overdue', 'achieved')),
  days_until_deadline INTEGER,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_proficiency_snapshots_assignment ON proficiency_snapshots(assignment_id, snapshot_at DESC);
CREATE INDEX idx_proficiency_snapshots_user_module ON proficiency_snapshots(user_id, module_id);
CREATE INDEX idx_proficiency_snapshots_snapshot_at ON proficiency_snapshots(snapshot_at DESC);

COMMENT ON TABLE proficiency_snapshots IS 'Historical proficiency tracking for trend analysis (Epic 14 v2.0)';
COMMENT ON COLUMN proficiency_snapshots.proficiency_pct IS 'Proficiency percentage at this snapshot';
COMMENT ON COLUMN proficiency_snapshots.target_difficulty_level IS 'Difficulty level being tracked (1=beginner, 5=expert)';
COMMENT ON COLUMN proficiency_snapshots.days_until_deadline IS 'Days remaining until deadline (negative if overdue)';

------------------------------------------------------------------------------
-- Step 6: Create uploaded_files table for proprietary content tracking
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS module_uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES manager_modules(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES module_creation_conversations(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'docx', 'pptx', 'video', etc.
  file_size_bytes INTEGER NOT NULL,
  storage_path TEXT NOT NULL, -- S3 path or local storage path
  processed BOOLEAN DEFAULT false,
  extracted_content TEXT, -- Text extracted from file
  content_summary TEXT, -- AI-generated summary
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_module_uploaded_files_module ON module_uploaded_files(module_id);
CREATE INDEX idx_module_uploaded_files_conversation ON module_uploaded_files(conversation_id);
CREATE INDEX idx_module_uploaded_files_organization ON module_uploaded_files(organization_id);
CREATE INDEX idx_module_uploaded_files_processed ON module_uploaded_files(processed) WHERE processed = false;

COMMENT ON TABLE module_uploaded_files IS 'Tracks files uploaded during module creation (Epic 14 v2.0)';
COMMENT ON COLUMN module_uploaded_files.processed IS 'True if file has been analyzed and content extracted';
COMMENT ON COLUMN module_uploaded_files.extracted_content IS 'Raw text extracted from file (OCR, parsing)';
COMMENT ON COLUMN module_uploaded_files.content_summary IS 'AI-generated summary of file contents';

------------------------------------------------------------------------------
-- Step 7: Create notification_queue table for at-risk/overdue alerts
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS module_assignment_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES module_assignments(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('at_risk', 'overdue', 'achieved', 'deadline_reminder')),
  recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_role TEXT NOT NULL CHECK (recipient_role IN ('learner', 'manager')),
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_module_assignment_notifications_assignment ON module_assignment_notifications(assignment_id);
CREATE INDEX idx_module_assignment_notifications_recipient ON module_assignment_notifications(recipient_user_id, sent_at DESC);
CREATE INDEX idx_module_assignment_notifications_unsent ON module_assignment_notifications(created_at) WHERE sent_at IS NULL;

COMMENT ON TABLE module_assignment_notifications IS 'Queue for proficiency/deadline notifications (Epic 14 v2.0)';
COMMENT ON COLUMN module_assignment_notifications.notification_type IS 'Type of notification: at_risk, overdue, achieved, deadline_reminder';
COMMENT ON COLUMN module_assignment_notifications.recipient_role IS 'Whether notification is for learner or manager';

------------------------------------------------------------------------------
-- Epic 14 v2.0 Migration Complete
------------------------------------------------------------------------------

