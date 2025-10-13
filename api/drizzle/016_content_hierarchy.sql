------------------------------------------------------------------------------
-- Epic 6/7/8: Content Meta Model Hierarchy
-- BRD: ALL (foundation for content structure)
-- FSD: §31 (Content Meta Model & Hierarchy)
-- Roadmap: Epic-Scope-Fix for content hierarchy refactor
------------------------------------------------------------------------------

-- Subjects: Top-level knowledge domains
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL, -- "Computer Science", "Finance", "Soft Skills"
  description TEXT,
  icon TEXT, -- for UI display (emoji or icon name)
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Topics: Content collection level (where we generate)
-- This is the primary unit of content generation and management
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL = canonical (public)
  title TEXT NOT NULL, -- "Machine Learning", "Async/Await", "Fire Safety"
  description TEXT,
  
  -- Certification
  is_certified BOOLEAN DEFAULT false, -- Cerply Certified badge
  certification_level TEXT CHECK (certification_level IN ('topic', 'module')), -- who certified
  certified_by UUID REFERENCES users(id), -- Expert who certified
  certified_at TIMESTAMPTZ,
  
  -- Content metadata
  content_source TEXT NOT NULL CHECK (content_source IN ('research', 'upload', 'url', 'prompt')),
  is_proprietary BOOLEAN DEFAULT false, -- true for org-specific uploads
  
  -- Freshness management
  last_refreshed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  refresh_frequency_months INTEGER DEFAULT 6,
  
  active BOOLEAN DEFAULT true, -- for assigned learners
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_topics_subject ON topics(subject_id);
CREATE INDEX idx_topics_organization ON topics(organization_id);
CREATE INDEX idx_topics_certified ON topics(is_certified) WHERE is_certified = true;
CREATE INDEX idx_topics_active ON topics(active) WHERE active = true;

-- Modules: Content provision level (what learners consume)
-- Renamed from current 'modules' table to avoid conflict during migration
CREATE TABLE modules_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- "LLM Architecture", "Transformer Models"
  order_index INTEGER NOT NULL, -- renamed from 'order' to avoid SQL keyword
  
  -- Certification (can certify individual modules OR inherit from topic)
  is_certified BOOLEAN DEFAULT false,
  certification_level TEXT CHECK (certification_level IN ('topic', 'module')),
  
  -- Provenance from 3-LLM ensemble
  provenance JSONB, -- {generator_a: ..., generator_b: ..., fact_checker: ...}
  
  estimated_duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_modules_v2_topic ON modules_v2(topic_id);
CREATE INDEX idx_modules_v2_order ON modules_v2(topic_id, order_index);

-- Quizzes: Assessment containers (multiple questions)
-- Groups questions together for better organization
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules_v2(id) ON DELETE CASCADE,
  title TEXT, -- optional title for quiz
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_quizzes_module ON quizzes(module_id);

-- Questions: Individual quiz items (renamed from 'items')
-- Maps to current 'items' table but with better hierarchy
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mcq', 'free', 'explainer')),
  stem TEXT NOT NULL,
  options JSONB, -- for MCQ: [{text: "...", correct: true/false}]
  correct_answer INTEGER, -- for MCQ: index of correct option (deprecated in favor of options.correct)
  guidance_text TEXT, -- explanation/guidance notes (replaces 'explainer' field)
  difficulty_level TEXT CHECK (difficulty_level IN ('recall', 'application', 'analysis', 'synthesis')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_questions_quiz ON questions(quiz_id);
CREATE INDEX idx_questions_type ON questions(type);

-- Topic assignments: Who is learning what
-- Replaces the implicit track subscription model
CREATE TABLE topic_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Assignment metadata
  is_mandatory BOOLEAN DEFAULT false,
  mandatory_until TIMESTAMPTZ, -- NULL if not mandatory or no deadline
  assigned_by UUID REFERENCES users(id), -- Manager who assigned
  assigned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Status
  paused BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  UNIQUE(topic_id, user_id) -- one assignment per user per topic
);

CREATE INDEX idx_topic_assignments_user ON topic_assignments(user_id);
CREATE INDEX idx_topic_assignments_team ON topic_assignments(team_id);
CREATE INDEX idx_topic_assignments_topic ON topic_assignments(topic_id);
CREATE INDEX idx_topic_assignments_active ON topic_assignments(user_id, paused, completed_at) WHERE paused = false AND completed_at IS NULL;

-- Topic citations: Sources for research-based content
-- Tracks research sources for Epic 6.5 (Research-Driven Generation)
CREATE TABLE topic_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  citation_text TEXT NOT NULL,
  source_url TEXT,
  source_type TEXT CHECK (source_type IN ('textbook', 'paper', 'course', 'documentation', 'website')),
  credibility_score DECIMAL(3, 2) CHECK (credibility_score >= 0 AND credibility_score <= 1), -- 0.00-1.00
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_topic_citations_topic ON topic_citations(topic_id);

-- Topic secondary sources: Company-specific context (Epic 6.8)
-- Proprietary content that contextualizes canonical topics
CREATE TABLE topic_secondary_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('url', 'upload', 'prompt')),
  source_url TEXT,
  source_file_path TEXT, -- S3 path for uploads
  metadata JSONB, -- flexible storage for source-specific data
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_topic_secondary_sources_topic ON topic_secondary_sources(topic_id);
CREATE INDEX idx_topic_secondary_sources_org ON topic_secondary_sources(organization_id);

-- Topic communications: Manager curation workflow (Epic 6.8)
-- Tracks assignment communications sent to learners
CREATE TABLE topic_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES users(id) ON DELETE CASCADE,
  draft_message TEXT, -- LLM-generated draft
  final_message TEXT, -- Manager-edited final message
  delivery_channels TEXT[] DEFAULT ARRAY[]::TEXT[], -- ['app', 'email', 'slack']
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_topic_communications_topic ON topic_communications(topic_id);
CREATE INDEX idx_topic_communications_manager ON topic_communications(manager_id);

------------------------------------------------------------------------------
-- Indexes for performance
------------------------------------------------------------------------------

-- Composite indexes for common queries
CREATE INDEX idx_topics_subject_active ON topics(subject_id, active) WHERE active = true;
CREATE INDEX idx_topics_org_active ON topics(organization_id, active) WHERE organization_id IS NOT NULL AND active = true;
CREATE INDEX idx_modules_v2_topic_order ON modules_v2(topic_id, order_index);
CREATE INDEX idx_quizzes_module_order ON quizzes(module_id, order_index);

------------------------------------------------------------------------------
-- Comments for documentation
------------------------------------------------------------------------------

COMMENT ON TABLE subjects IS 'Top-level knowledge domains (e.g., Computer Science, Finance)';
COMMENT ON TABLE topics IS 'Content collection level - where we generate (4-6 modules per topic)';
COMMENT ON TABLE modules_v2 IS 'Content provision level - what learners consume (replaces old modules table)';
COMMENT ON TABLE quizzes IS 'Assessment containers grouping multiple questions';
COMMENT ON TABLE questions IS 'Individual quiz items (replaces old items table)';
COMMENT ON TABLE topic_assignments IS 'Tracks who is learning what (replaces track subscriptions)';
COMMENT ON TABLE topic_citations IS 'Research sources for topic content (Epic 6.5)';
COMMENT ON TABLE topic_secondary_sources IS 'Company-specific contextual content (Epic 6.8)';
COMMENT ON TABLE topic_communications IS 'Assignment communications to learners (Epic 6.8)';

