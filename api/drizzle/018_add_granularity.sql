/**
 * Migration: Add granularity detection column
 * Epic: 6 - Ensemble Content Generation (Enhancement)
 * BRD: B-3 (Intelligent curriculum design)
 * FSD: §26 (Content Generation with granularity detection)
 * Date: 2025-10-13
 * 
 * Purpose: Add granularity column to track subject/topic/module detection
 * This is THE critical feature - intelligent curriculum design
 */

-- Add granularity column to content_generations
ALTER TABLE content_generations 
ADD COLUMN IF NOT EXISTS granularity TEXT;

COMMENT ON COLUMN content_generations.granularity IS 
'Detected granularity level: subject (8-12 topics), topic (4-6 modules), or module (1 deep module). Auto-detected from input.';

-- Add index for filtering by granularity
CREATE INDEX IF NOT EXISTS idx_content_generations_granularity 
ON content_generations(granularity);

-- Backfill existing records with default 'topic'
UPDATE content_generations 
SET granularity = 'topic' 
WHERE granularity IS NULL;

