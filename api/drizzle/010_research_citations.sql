-- Citations table for research mode
CREATE TABLE IF NOT EXISTS citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID NOT NULL REFERENCES content_generations(id) ON DELETE CASCADE,
  citation_text TEXT NOT NULL,
  title TEXT,
  author TEXT,
  source_type TEXT, -- textbook, paper, course, video, website
  url TEXT,
  relevance TEXT,
  validation_status TEXT, -- verified, questionable, unverified
  confidence_score NUMERIC(3,2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_citations_generation ON citations(generation_id);

-- Add input_type to content_generations
ALTER TABLE content_generations ADD COLUMN IF NOT EXISTS input_type TEXT DEFAULT 'source';
ALTER TABLE content_generations ADD COLUMN IF NOT EXISTS ethical_flags JSONB DEFAULT '[]';

