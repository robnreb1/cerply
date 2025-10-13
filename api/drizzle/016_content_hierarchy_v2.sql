------------------------------------------------------------------------------
-- Epic 6/7/8: Content Meta Model Hierarchy (Fixed for existing database)
-- BRD: ALL (foundation for content structure)
-- FSD: §31 (Content Meta Model & Hierarchy)
-- Roadmap: Epic-Scope-Fix for content hierarchy refactor
------------------------------------------------------------------------------
-- NOTE: This version works with databases that don't have organizations/teams tables yet
------------------------------------------------------------------------------

-- Topics: Content collection level (where we generate)
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  organization_id UUID, -- Will be linked when organizations table is created
  title TEXT NOT NULL,
  description TEXT,
  
  -- Certification
  is_certified BOOLEAN DEFAULT false,
  certification_level TEXT CHECK (certification_level IN ('topic', 'module')),
  certified_by TEXT REFERENCES users(id),
  certified_at TIMESTAMPTZ,
  
  -- Content metadata
  content_source TEXT NOT NULL CHECK (content_source IN ('research', 'upload', 'url', 'prompt')),
  is_proprietary BOOLEAN DEFAULT false,
  
  -- Freshness management
  last_refreshed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  refresh_frequency_months INTEGER DEFAULT 6,
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_topics_organization ON topics(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_topics_certified ON topics(is_certified) WHERE is_certified = true;
CREATE INDEX IF NOT EXISTS idx_topics_active ON topics(active) WHERE active = true;

-- Modules v2: Content provision level (what learners consume)
CREATE TABLE IF NOT EXISTS modules_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  
  -- Certification (can certify individual modules OR inherit from topic)
  is_certified BOOLEAN DEFAULT false,
  certification_level TEXT CHECK (certification_level IN ('topic', 'module')),
  
  -- Provenance from 3-LLM ensemble
  provenance JSONB,
  
  estimated_duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_modules_v2_topic ON modules_v2(topic_id);
CREATE INDEX IF NOT EXISTS idx_modules_v2_order ON modules_v2(topic_id, order_index);

-- Quizzes: Assessment containers (multiple questions)
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules_v2(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quizzes_module ON quizzes(module_id);

-- Questions: Individual quiz items (renamed from 'items')
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mcq', 'free', 'explainer')),
  stem TEXT NOT NULL,
  options JSONB,
  correct_answer INTEGER,
  guidance_text TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('recall', 'application', 'analysis', 'synthesis')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_quiz ON questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);

-- Topic assignments: Who is learning what
CREATE TABLE IF NOT EXISTS topic_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  team_id UUID, -- Will be linked when teams table is created
  
  -- Assignment metadata
  is_mandatory BOOLEAN DEFAULT false,
  mandatory_until TIMESTAMPTZ,
  assigned_by TEXT REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Status
  paused BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  UNIQUE(topic_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_topic_assignments_user ON topic_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_topic_assignments_team ON topic_assignments(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_topic_assignments_topic ON topic_assignments(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_assignments_active ON topic_assignments(user_id, paused, completed_at) 
  WHERE paused = false AND completed_at IS NULL;

-- Topic citations: Sources for research-based content
CREATE TABLE IF NOT EXISTS topic_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE NOT NULL,
  citation_text TEXT NOT NULL,
  source_url TEXT,
  source_type TEXT CHECK (source_type IN ('textbook', 'paper', 'course', 'documentation', 'website')),
  credibility_score DECIMAL(3, 2) CHECK (credibility_score >= 0 AND credibility_score <= 1),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_topic_citations_topic ON topic_citations(topic_id);

-- Topic secondary sources: Company-specific context (Epic 6.8)
CREATE TABLE IF NOT EXISTS topic_secondary_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID, -- Will be linked when organizations table is created
  source_type TEXT NOT NULL CHECK (source_type IN ('url', 'upload', 'prompt')),
  source_url TEXT,
  source_file_path TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_topic_secondary_sources_topic ON topic_secondary_sources(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_secondary_sources_org ON topic_secondary_sources(organization_id) WHERE organization_id IS NOT NULL;

-- Topic communications: Manager curation workflow (Epic 6.8)
CREATE TABLE IF NOT EXISTS topic_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE NOT NULL,
  manager_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  draft_message TEXT,
  final_message TEXT,
  delivery_channels TEXT[] DEFAULT ARRAY[]::TEXT[],
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_topic_communications_topic ON topic_communications(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_communications_manager ON topic_communications(manager_id);

------------------------------------------------------------------------------
-- Comments for documentation
------------------------------------------------------------------------------

COMMENT ON TABLE subjects IS 'Top-level knowledge domains (e.g., Computer Science, Finance)';
COMMENT ON TABLE topics IS 'Content collection level - where we generate (4-6 modules per topic)';
COMMENT ON TABLE modules_v2 IS 'Content provision level - what learners consume';
COMMENT ON TABLE quizzes IS 'Assessment containers grouping multiple questions';
COMMENT ON TABLE questions IS 'Individual quiz items (replaces old items table)';
COMMENT ON TABLE topic_assignments IS 'Tracks who is learning what';
COMMENT ON TABLE topic_citations IS 'Research sources for topic content (Epic 6.5)';
COMMENT ON TABLE topic_secondary_sources IS 'Company-specific contextual content (Epic 6.8)';
COMMENT ON TABLE topic_communications IS 'Assignment communications to learners (Epic 6.8)';

------------------------------------------------------------------------------
-- Update existing tables to use new hierarchy
------------------------------------------------------------------------------

-- Update learner_levels: Add topic_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='learner_levels' AND column_name='topic_id') THEN
    ALTER TABLE learner_levels ADD COLUMN topic_id UUID REFERENCES topics(id) ON DELETE CASCADE;
    CREATE INDEX idx_learner_levels_topic ON learner_levels(topic_id);
  END IF;
END $$;

-- Update certificates: Add topic_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='certificates' AND column_name='topic_id') THEN
    ALTER TABLE certificates ADD COLUMN topic_id UUID REFERENCES topics(id) ON DELETE CASCADE;
    CREATE INDEX idx_certificates_topic ON certificates(topic_id);
  END IF;
END $$;

-- Update attempts: Add question_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attempts' AND column_name='question_id') THEN
    ALTER TABLE attempts ADD COLUMN question_id UUID REFERENCES questions(id) ON DELETE CASCADE;
    CREATE INDEX idx_attempts_question ON attempts(question_id);
  END IF;
END $$;

-- Update confusion_log: Ensure it references questions (not items)
-- Note: This table already exists and should already reference question_id

------------------------------------------------------------------------------
-- Success message
------------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE 'Content hierarchy schema created successfully!';
  RAISE NOTICE 'Created 9 tables: subjects, topics, modules_v2, quizzes, questions, topic_assignments, topic_citations, topic_secondary_sources, topic_communications';
  RAISE NOTICE 'Updated 3 existing tables: learner_levels, certificates, attempts';
END $$;

