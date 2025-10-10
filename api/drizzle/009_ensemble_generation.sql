------------------------------------------------------------------------------
-- Epic 6: Ensemble Content Generation (Quality Pipeline)
-- BRD: B-3, E-14 | FSD: §26 Ensemble Content Generation v1
-- Feature Flags: FF_ENSEMBLE_GENERATION_V1, FF_CONTENT_CANON_V1
------------------------------------------------------------------------------

-- Table: content_generations
-- Tracks each content generation request through the 3-LLM ensemble pipeline
CREATE TABLE content_generations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  manager_id            UUID NOT NULL REFERENCES users(id),
  artefact_text         TEXT NOT NULL, -- Source material (policy, transcript, etc)
  understanding         TEXT, -- LLM's playback of what it understood
  understanding_approved BOOLEAN DEFAULT FALSE,
  refinement_iterations INTEGER DEFAULT 0,
  status                TEXT NOT NULL DEFAULT 'pending', -- pending, understanding, generating, completed, failed
  content_type          TEXT CHECK (content_type IN ('generic', 'proprietary', 'mixed')),
  
  -- Generation results from 3-LLM ensemble
  generator_a_output    JSONB, -- {modules: [...], model: 'gpt-4o'}
  generator_b_output    JSONB, -- {modules: [...], model: 'claude-sonnet-3.5'}
  fact_checker_output   JSONB, -- {finalModules: [...], provenance: [...], confidence: 0.95}
  
  -- Cost and performance tracking
  total_cost_usd        NUMERIC(10,4), -- Sum of all LLM calls
  total_tokens          INTEGER,
  generation_time_ms    INTEGER,
  
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_generations_org ON content_generations(organization_id);
CREATE INDEX idx_content_generations_manager ON content_generations(manager_id);
CREATE INDEX idx_content_generations_status ON content_generations(status);
CREATE INDEX idx_content_generations_type ON content_generations(content_type);

-- Table: content_refinements
-- Tracks manager's iterative refinement of LLM understanding (max 3 iterations)
CREATE TABLE content_refinements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id     UUID NOT NULL REFERENCES content_generations(id) ON DELETE CASCADE,
  iteration         INTEGER NOT NULL, -- 1, 2, 3 (max 3)
  manager_feedback  TEXT NOT NULL, -- "Focus more on evacuation procedures"
  llm_response      TEXT NOT NULL, -- Updated understanding incorporating feedback
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(generation_id, iteration)
);

CREATE INDEX idx_content_refinements_generation ON content_refinements(generation_id);

-- Table: content_provenance
-- Tracks which LLM contributed which sections (audit trail for compliance)
CREATE TABLE content_provenance (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id     UUID NOT NULL REFERENCES content_generations(id) ON DELETE CASCADE,
  module_id         TEXT NOT NULL, -- Reference to specific module
  section_type      TEXT NOT NULL, -- 'explanation', 'question', 'example'
  source_llm        TEXT NOT NULL, -- 'generator-a', 'generator-b', 'fact-checker'
  source_model      TEXT NOT NULL, -- 'gpt-4o', 'claude-sonnet-3.5-20241022', 'gpt-4'
  confidence_score  NUMERIC(3,2), -- 0.00 to 1.00
  selected_by       TEXT, -- 'fact-checker', 'manager'
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_provenance_generation ON content_provenance(generation_id);
CREATE INDEX idx_content_provenance_module ON content_provenance(module_id);

------------------------------------------------------------------------------
-- End of Epic 6 Migration
------------------------------------------------------------------------------

