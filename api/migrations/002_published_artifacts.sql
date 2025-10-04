-- Migration: Add PublishedArtifact table and lockHash to AdminItem
-- EPIC #56: Certified Publish v1 [OKR: O1.KR1]

-- Add lockHash column to admin_items
ALTER TABLE admin_items ADD COLUMN lock_hash TEXT;

-- Create published_artifacts table
CREATE TABLE published_artifacts (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  signature TEXT NOT NULL,
  path TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES admin_items(id) ON DELETE CASCADE
);

-- Create index for efficient queries
CREATE INDEX idx_published_artifacts_item_created ON published_artifacts(item_id, created_at DESC);

