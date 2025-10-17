-- Migration: Manager Module Workflows
-- Epic 14: Manager-driven module creation, assignment, and tracking
-- Enables managers to build training modules and assign to teams

-- Table 1: Manager Modules
-- Core module definition created by managers from topics
CREATE TABLE IF NOT EXISTS manager_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  is_mandatory BOOLEAN DEFAULT false,
  target_roles JSONB, -- ['manager', 'engineer', 'analyst']
  prerequisites JSONB, -- [moduleId1, moduleId2]
  estimated_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_manager_modules_created_by ON manager_modules(created_by);
CREATE INDEX idx_manager_modules_status ON manager_modules(status);
CREATE INDEX idx_manager_modules_topic_id ON manager_modules(topic_id);
CREATE INDEX idx_manager_modules_updated_at ON manager_modules(updated_at DESC);

-- Table 2: Module Assignments
-- Tracks which users are assigned which modules
CREATE TABLE IF NOT EXISTS module_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES manager_modules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  mastery_score NUMERIC(3, 2), -- 0.00 to 1.00
  time_spent_seconds INTEGER DEFAULT 0,
  UNIQUE(module_id, user_id)
);

CREATE INDEX idx_module_assignments_user_id ON module_assignments(user_id, status);
CREATE INDEX idx_module_assignments_module_id ON module_assignments(module_id);
CREATE INDEX idx_module_assignments_assigned_by ON module_assignments(assigned_by);
CREATE INDEX idx_module_assignments_status ON module_assignments(status);
CREATE INDEX idx_module_assignments_due_date ON module_assignments(due_date) WHERE due_date IS NOT NULL;

-- Table 3: Module Proprietary Content
-- Manager-uploaded company-specific content
CREATE TABLE IF NOT EXISTS module_proprietary_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES manager_modules(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('document', 'case_study', 'policy', 'video')),
  title TEXT NOT NULL,
  content TEXT,
  source_url TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_module_proprietary_content_module_id ON module_proprietary_content(module_id);
CREATE INDEX idx_module_proprietary_content_uploaded_by ON module_proprietary_content(uploaded_by);

-- Table 4: Module Content Edits
-- Audit trail for manager refinements to generated content
CREATE TABLE IF NOT EXISTS module_content_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES manager_modules(id) ON DELETE CASCADE,
  edited_by UUID NOT NULL REFERENCES users(id),
  edit_type TEXT NOT NULL CHECK (edit_type IN ('section_edit', 'question_add', 'question_edit', 'guidance_edit')),
  section_id UUID, -- References content_corpus or questions
  before_content JSONB,
  after_content JSONB,
  edit_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_module_content_edits_module_id ON module_content_edits(module_id);
CREATE INDEX idx_module_content_edits_edited_by ON module_content_edits(edited_by);
CREATE INDEX idx_module_content_edits_created_at ON module_content_edits(created_at DESC);

-- Permissions: Only managers can create/edit modules
COMMENT ON TABLE manager_modules IS 'Training modules created by managers from topics (Epic 14)';
COMMENT ON TABLE module_assignments IS 'Tracks module assignments to team members';
COMMENT ON TABLE module_proprietary_content IS 'Company-specific content added by managers';
COMMENT ON TABLE module_content_edits IS 'Audit trail of manager content refinements';

