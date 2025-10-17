-- Migration 023: Rich Content Corpus for PhD-Level Generation
-- Stores comprehensive, encyclopedia-level content with full citations

-- Content corpus: Rich, structured content sections
CREATE TABLE IF NOT EXISTS content_corpus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL, -- 'historical', 'theoretical', 'technical', 'practical', 'future'
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Rich markdown content with inline citations
  order_index INTEGER NOT NULL,
  
  -- Rich media
  code_examples JSONB, -- [{language, code, explanation, fileName}]
  diagrams JSONB, -- [{type, description, mermaidCode}]
  formulas JSONB, -- [{latex, explanation, variables}]
  
  -- Metadata
  word_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_corpus_topic ON content_corpus(topic_id);
CREATE INDEX idx_content_corpus_section_type ON content_corpus(section_type);

-- Topic Citations: Full academic citations (renamed to avoid conflict with existing citations table)
CREATE TABLE IF NOT EXISTS topic_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  citation_number INTEGER NOT NULL, -- [1], [2], [3] in text
  
  -- Citation details
  type TEXT NOT NULL, -- 'journal', 'book', 'specification', 'report', 'website'
  title TEXT NOT NULL,
  authors JSONB, -- ["Author 1", "Author 2"]
  year INTEGER,
  publisher TEXT,
  doi TEXT,
  url TEXT,
  isbn TEXT,
  
  -- Quality indicators
  is_peer_reviewed BOOLEAN DEFAULT false,
  is_primary_source BOOLEAN DEFAULT false,
  credibility_score NUMERIC(3,2), -- 0.00-1.00
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_topic_citations_topic ON topic_citations(topic_id);
CREATE UNIQUE INDEX idx_topic_citations_topic_number ON topic_citations(topic_id, citation_number);

-- Suggested modules: Proposed learning modules from content
CREATE TABLE IF NOT EXISTS suggested_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  
  -- Learning design
  learning_objectives JSONB NOT NULL, -- ["Objective 1", "Objective 2"]
  key_concepts JSONB NOT NULL, -- ["Concept 1", "Concept 2"]
  estimated_hours NUMERIC(4,1),
  prerequisites JSONB, -- ["Prerequisite 1"]
  
  -- Assessment approach (NOT multiple choice)
  assessment_type TEXT, -- 'code_review', 'design_critique', 'case_analysis', 'essay', 'presentation', 'project'
  assessment_description TEXT,
  
  -- Content mapping
  corpus_section_ids JSONB, -- [uuid1, uuid2] - which corpus sections this module covers
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suggested_modules_topic ON suggested_modules(topic_id);

-- Ensemble provenance for PhD-level generation
CREATE TABLE IF NOT EXISTS phd_ensemble_provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  
  -- Pipeline details
  lead_model TEXT NOT NULL, -- 'gpt-5'
  critique_model TEXT NOT NULL, -- 'claude-opus-4'
  verify_model TEXT NOT NULL, -- 'gpt-4o'
  
  -- Results
  lead_output_length INTEGER,
  critique_score NUMERIC(3,2), -- 0.00-1.00
  verification_accuracy NUMERIC(3,2), -- 0.00-1.00
  flagged_claims INTEGER DEFAULT 0,
  total_citations INTEGER DEFAULT 0,
  verified_citations INTEGER DEFAULT 0,
  
  -- Costs
  lead_cost_usd NUMERIC(10,4),
  critique_cost_usd NUMERIC(10,4),
  verify_cost_usd NUMERIC(10,4),
  total_cost_usd NUMERIC(10,4),
  
  -- Timing
  lead_time_ms INTEGER,
  critique_time_ms INTEGER,
  verify_time_ms INTEGER,
  total_time_ms INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_phd_provenance_topic ON phd_ensemble_provenance(topic_id);

-- Verification flags: Issues found during fact-checking
CREATE TABLE IF NOT EXISTS verification_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  corpus_section_id UUID REFERENCES content_corpus(id) ON DELETE CASCADE,
  
  -- Issue details
  claim_text TEXT NOT NULL,
  issue_type TEXT NOT NULL, -- 'citation_not_found', 'fact_incorrect', 'unsupported', 'outdated'
  severity TEXT NOT NULL, -- 'critical', 'moderate', 'minor'
  recommendation TEXT,
  
  -- Resolution
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT REFERENCES users(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_verification_flags_topic ON verification_flags(topic_id);
CREATE INDEX idx_verification_flags_unresolved ON verification_flags(topic_id, resolved) WHERE resolved = false;

