-- Migration: Question-level performance tracking
-- Epic 14 OKR Gap Analysis - P0 Features

-- Table for tracking question performance metrics
CREATE TABLE IF NOT EXISTS question_performance_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL, -- References questions in content_corpus or generated_questions
  module_id UUID NOT NULL REFERENCES manager_modules(id) ON DELETE CASCADE,
  
  -- Performance metrics
  attempts_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  incorrect_count INTEGER DEFAULT 0,
  avg_time_seconds NUMERIC(8,2) DEFAULT 0,
  
  -- Difficulty analysis
  perceived_difficulty TEXT CHECK (perceived_difficulty IN ('too_easy', 'appropriate', 'too_hard')),
  
  -- Engagement metrics
  skip_count INTEGER DEFAULT 0,
  hint_requests_count INTEGER DEFAULT 0,
  
  -- Timestamps
  first_attempted_at TIMESTAMPTZ,
  last_attempted_at TIMESTAMPTZ,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(question_id, module_id)
);

CREATE INDEX idx_question_stats_module ON question_performance_stats(module_id);
CREATE INDEX idx_question_stats_question ON question_performance_stats(question_id);
CREATE INDEX idx_question_stats_difficulty ON question_performance_stats(perceived_difficulty) WHERE perceived_difficulty IS NOT NULL;
CREATE INDEX idx_question_stats_last_attempted ON question_performance_stats(last_attempted_at DESC);

-- Add success rate as a computed value helper
COMMENT ON COLUMN question_performance_stats.correct_count IS 'Number of correct attempts (success_rate = correct_count / attempts_count)';
COMMENT ON TABLE question_performance_stats IS 'Tracks performance metrics for each question within manager modules';

-- Add question difficulty to questions metadata (for future use)
-- Note: This assumes questions are stored with JSONB metadata
-- If questions table structure changes, adjust accordingly
COMMENT ON TABLE question_performance_stats IS 'Epic 14 P0: Question-level performance tracking for manager analytics';

