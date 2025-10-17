-- Migration: 022_batch_generation.sql
-- Epic 6.6: Content Library Seeding
-- Batch job tracking and topic queue management

-- Batch jobs
CREATE TABLE IF NOT EXISTS batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id TEXT NOT NULL UNIQUE,
  phase TEXT NOT NULL CHECK (phase IN ('uat', 'production')),
  total_topics INTEGER NOT NULL,
  completed_topics INTEGER DEFAULT 0,
  failed_topics INTEGER DEFAULT 0,
  total_cost DECIMAL(10, 2) DEFAULT 0.00,
  avg_quality DECIMAL(3, 2),
  avg_citation_accuracy DECIMAL(3, 2),
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'paused', 'completed', 'failed')),
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Batch topics (individual topics within a batch)
CREATE TABLE IF NOT EXISTS batch_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES batch_jobs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'generating', 'completed', 'failed')),
  topic_id TEXT, -- References topics table once generated
  cost DECIMAL(10, 2),
  quality_score DECIMAL(3, 2),
  citation_accuracy DECIMAL(3, 2),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_batch_topics_batch_id ON batch_topics(batch_id);
CREATE INDEX idx_batch_topics_status ON batch_topics(status);
CREATE INDEX idx_batch_jobs_status ON batch_jobs(status);
CREATE INDEX idx_batch_jobs_phase ON batch_jobs(phase);

