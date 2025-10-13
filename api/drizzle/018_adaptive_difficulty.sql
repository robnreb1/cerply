------------------------------------------------------------------------------
-- Epic 9: True Adaptive Difficulty Engine
-- BRD: L-2 (Adaptive lesson plans with dynamic difficulty adjustment)
-- FSD: §30 (True Adaptive Difficulty Engine)
-- Roadmap: docs/MVP_B2B_ROADMAP.md (Epic 9, EPIC9_IMPLEMENTATION_PROMPT_v2.md)
------------------------------------------------------------------------------
-- Phase 1: Database Schema for Adaptive Difficulty Engine
-- Creates learner_profiles and topic_comprehension tables
-- Extends attempts table with response_time_ms and difficulty_level
------------------------------------------------------------------------------

-- Learner Profiles: Track learning style and consistency per user
CREATE TABLE IF NOT EXISTS learner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- TEXT to match users.id type
  learning_style TEXT CHECK (learning_style IN ('visual', 'verbal', 'kinesthetic', 'balanced', 'unknown')),
  avg_response_time NUMERIC(10,2), -- milliseconds
  consistency_score NUMERIC(3,2) CHECK (consistency_score >= 0.00 AND consistency_score <= 1.00), -- 0.00 - 1.00
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_learner_profiles_user ON learner_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_learner_profiles_learning_style ON learner_profiles(learning_style) WHERE learning_style IS NOT NULL;

COMMENT ON TABLE learner_profiles IS 'Epic 9: Learner profiles with learning style detection and performance metrics';
COMMENT ON COLUMN learner_profiles.learning_style IS 'Detected learning preference: visual/verbal/kinesthetic/balanced/unknown';
COMMENT ON COLUMN learner_profiles.avg_response_time IS 'Rolling average response time in milliseconds';
COMMENT ON COLUMN learner_profiles.consistency_score IS 'Performance consistency (0.00 = inconsistent, 1.00 = highly consistent)';

-- Topic Comprehension: Track mastery level per user per topic
CREATE TABLE IF NOT EXISTS topic_comprehension (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- TEXT to match users.id type
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  mastery_level NUMERIC(3,2) NOT NULL DEFAULT 0.00 CHECK (mastery_level >= 0.00 AND mastery_level <= 1.00), -- 0.00 - 1.00
  difficulty_level TEXT NOT NULL DEFAULT 'recall' CHECK (difficulty_level IN ('recall', 'application', 'analysis', 'synthesis')),
  attempts_count INTEGER DEFAULT 0 NOT NULL,
  correct_count INTEGER DEFAULT 0 NOT NULL,
  partial_credit_sum NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
  confusion_count INTEGER DEFAULT 0 NOT NULL,
  last_practiced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_topic_comprehension_user ON topic_comprehension(user_id);
CREATE INDEX IF NOT EXISTS idx_topic_comprehension_topic ON topic_comprehension(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_comprehension_mastery ON topic_comprehension(mastery_level);
CREATE INDEX IF NOT EXISTS idx_topic_comprehension_user_mastery ON topic_comprehension(user_id, mastery_level);
CREATE INDEX IF NOT EXISTS idx_topic_comprehension_weak_topics ON topic_comprehension(user_id, mastery_level) WHERE mastery_level < 0.70;

COMMENT ON TABLE topic_comprehension IS 'Epic 9: Per-topic mastery tracking for adaptive difficulty engine';
COMMENT ON COLUMN topic_comprehension.mastery_level IS 'Calculated mastery score (0.00 - 1.00) based on time-weighted performance';
COMMENT ON COLUMN topic_comprehension.difficulty_level IS 'Current recommended difficulty: recall/application/analysis/synthesis (Bloom''s Taxonomy)';
COMMENT ON COLUMN topic_comprehension.attempts_count IS 'Total number of attempts for this user+topic';
COMMENT ON COLUMN topic_comprehension.correct_count IS 'Number of fully correct attempts';
COMMENT ON COLUMN topic_comprehension.partial_credit_sum IS 'Sum of partial credit scores (Epic 8 free-text validation)';
COMMENT ON COLUMN topic_comprehension.confusion_count IS 'Number of confusion queries (from Epic 8 confusion_log)';
COMMENT ON COLUMN topic_comprehension.last_practiced_at IS 'Last time user practiced this topic (for spaced repetition)';

-- Extend attempts table with Epic 9 fields (if not already present)
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS response_time_ms INTEGER;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS difficulty_level TEXT CHECK (difficulty_level IN ('recall', 'application', 'analysis', 'synthesis'));

COMMENT ON COLUMN attempts.response_time_ms IS 'Epic 9: Response time in milliseconds for adaptive difficulty';
COMMENT ON COLUMN attempts.difficulty_level IS 'Epic 9: Difficulty level of the question at time of attempt';

-- Create trigger to update updated_at on learner_profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_learner_profiles_updated_at
  BEFORE UPDATE ON learner_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topic_comprehension_updated_at
  BEFORE UPDATE ON topic_comprehension
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

------------------------------------------------------------------------------
-- Migration complete: Epic 9 Phase 1
-- Next: Phase 2 - Build adaptive service (api/src/services/adaptive.ts)
------------------------------------------------------------------------------

