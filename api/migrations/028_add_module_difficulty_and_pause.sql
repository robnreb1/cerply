-- Migration: Add difficulty level and pause functionality to manager modules
-- Epic 14 OKR Gap Analysis - P0 Features

-- Add difficulty_level column
ALTER TABLE manager_modules 
ADD COLUMN IF NOT EXISTS difficulty_level TEXT 
CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert'));

-- Add paused_at column for content pausing
ALTER TABLE manager_modules 
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;

-- Add index for paused modules queries
CREATE INDEX IF NOT EXISTS idx_manager_modules_paused 
ON manager_modules(paused_at) WHERE paused_at IS NOT NULL;

-- Add comments
COMMENT ON COLUMN manager_modules.difficulty_level IS 'Module difficulty level for learner guidance';
COMMENT ON COLUMN manager_modules.paused_at IS 'Timestamp when module was paused (NULL = active)';

