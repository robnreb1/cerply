------------------------------------------------------------------------------
-- Epic 6/7/8: Migrate Legacy Content to New Hierarchy
-- BRD: ALL (preserve existing data during refactor)
-- FSD: §31 (Content Meta Model & Hierarchy)
-- Roadmap: Epic-Scope-Fix for content hierarchy refactor
------------------------------------------------------------------------------
-- WARNING: This migration is DESTRUCTIVE and should be tested on staging first
-- It transforms the old Track > Module > Item structure to new Subject > Topic > Module > Quiz > Question
------------------------------------------------------------------------------

BEGIN;

------------------------------------------------------------------------------
-- Step 1: Create default subject for all existing content
------------------------------------------------------------------------------

INSERT INTO subjects (id, title, description, icon, active)
VALUES (
  '00000000-0000-0000-0000-000000000001'::UUID,
  'General Knowledge',
  'Legacy content migrated from track-based system',
  '📚',
  true
);

------------------------------------------------------------------------------
-- Step 2: Migrate tracks → topics
------------------------------------------------------------------------------

-- Map existing tracks to topics
-- Each track becomes a topic under the default subject
INSERT INTO topics (
  id,
  subject_id,
  organization_id,
  title,
  description,
  content_source,
  is_proprietary,
  is_certified,
  last_refreshed_at,
  active,
  created_at,
  updated_at
)
SELECT
  t.id,
  '00000000-0000-0000-0000-000000000001'::UUID, -- default subject
  t.organization_id,
  t.title,
  'Migrated from track: ' || t.plan_ref,
  'prompt', -- assume prompt-based for legacy
  CASE WHEN t.organization_id IS NULL THEN false ELSE true END, -- org-specific = proprietary
  CASE WHEN t.certified_artifact_id IS NOT NULL THEN true ELSE false END,
  t.created_at, -- use creation date as last refresh
  true, -- assume all active
  t.created_at,
  t.updated_at
FROM tracks t;

------------------------------------------------------------------------------
-- Step 3: Migrate modules → modules_v2
------------------------------------------------------------------------------

-- First, we need to link modules to topics via plans
-- Existing schema: plans reference tracks via plan_ref (e.g., 'canon:arch-std-v1')
-- We'll map modules to topics by finding the track that matches the plan

-- Create a temp table to map plan_id → topic_id
CREATE TEMP TABLE plan_to_topic_map AS
SELECT DISTINCT
  p.id AS plan_id,
  t.id AS topic_id
FROM plans p
JOIN tracks tr ON (tr.plan_ref = 'plan:' || p.id::TEXT)
JOIN topics t ON t.id = tr.id;

-- Now migrate modules
INSERT INTO modules_v2 (
  id,
  topic_id,
  title,
  order_index,
  provenance,
  created_at,
  updated_at
)
SELECT
  m.id,
  COALESCE(ptm.topic_id, '00000000-0000-0000-0000-000000000001'::UUID), -- fallback to default topic
  m.title,
  m.order AS order_index,
  NULL, -- no provenance for legacy modules
  now(),
  now()
FROM modules m
LEFT JOIN plan_to_topic_map ptm ON ptm.plan_id = m.plan_id;

------------------------------------------------------------------------------
-- Step 4: Migrate items → quizzes + questions
------------------------------------------------------------------------------

-- For each module, create ONE default quiz
INSERT INTO quizzes (
  id,
  module_id,
  title,
  order_index,
  created_at
)
SELECT
  gen_random_uuid(),
  m.id AS module_id,
  'Assessment', -- default quiz title
  1, -- first quiz in module
  now()
FROM modules_v2 m;

-- Create a temp table to map module_id → quiz_id
CREATE TEMP TABLE module_to_quiz_map AS
SELECT
  module_id,
  id AS quiz_id
FROM quizzes;

-- Now migrate items to questions
INSERT INTO questions (
  id,
  quiz_id,
  type,
  stem,
  options,
  correct_answer,
  guidance_text,
  created_at
)
SELECT
  i.id,
  mtqm.quiz_id,
  i.type,
  i.stem,
  i.options,
  i.answer AS correct_answer,
  i.explainer AS guidance_text,
  i.created_at
FROM items i
JOIN module_to_quiz_map mtqm ON mtqm.module_id = i.module_id;

------------------------------------------------------------------------------
-- Step 5: Update foreign keys in dependent tables
------------------------------------------------------------------------------

-- Update learner_levels: track_id → topic_id
-- Since topics have same IDs as tracks (from migration), this is a rename
ALTER TABLE learner_levels RENAME COLUMN track_id TO topic_id;

-- Update certificates: track_id → topic_id
ALTER TABLE certificates RENAME COLUMN track_id TO topic_id;

-- Update team_analytics_snapshots: track_id → topic_id (nullable)
ALTER TABLE team_analytics_snapshots RENAME COLUMN track_id TO topic_id;

-- Update learner_analytics_snapshots: track_id → topic_id (nullable)
ALTER TABLE learner_analytics_snapshots RENAME COLUMN track_id TO topic_id;

-- Update retention_curves: track_id → topic_id (nullable)
ALTER TABLE retention_curves RENAME COLUMN track_id TO topic_id;

-- Update attempts: item_id → question_id
-- Items have been migrated to questions with same IDs, so this is a rename
ALTER TABLE attempts RENAME COLUMN item_id TO question_id;

------------------------------------------------------------------------------
-- Step 6: Create topic_assignments from existing team_track_subscriptions
------------------------------------------------------------------------------

-- For each active team track subscription, create assignments for all team members
INSERT INTO topic_assignments (
  topic_id,
  user_id,
  team_id,
  is_mandatory,
  assigned_by,
  assigned_at,
  paused,
  completed_at
)
SELECT DISTINCT
  tts.track_id AS topic_id, -- track_id was renamed to topic_id above
  tm.user_id,
  tts.team_id,
  false, -- default to not mandatory
  NULL, -- no explicit assigner for legacy subscriptions
  tts.start_at AS assigned_at,
  NOT tts.active AS paused,
  NULL -- no completion tracking in old system
FROM team_track_subscriptions tts
JOIN team_members tm ON tm.team_id = tts.team_id
WHERE tts.active = true;

------------------------------------------------------------------------------
-- Step 7: Deprecate old tables (commented out for safety)
------------------------------------------------------------------------------

-- DO NOT drop old tables immediately - keep for rollback safety
-- After verifying migration success:
-- DROP TABLE team_track_subscriptions;
-- DROP TABLE items; -- now questions
-- DROP TABLE modules; -- now modules_v2
-- DROP TABLE plans; -- may still be needed for some queries
-- DROP TABLE tracks; -- now topics

-- Instead, rename them to _legacy for reference
ALTER TABLE items RENAME TO items_legacy;
ALTER TABLE modules RENAME TO modules_legacy;
ALTER TABLE plans RENAME TO plans_legacy;
ALTER TABLE tracks RENAME TO tracks_legacy;
ALTER TABLE team_track_subscriptions RENAME TO team_track_subscriptions_legacy;

------------------------------------------------------------------------------
-- Step 8: Verification queries (commented out - run manually after migration)
------------------------------------------------------------------------------

-- Verify subject count
-- SELECT COUNT(*) FROM subjects; -- should be 1 (default)

-- Verify topics count matches old tracks count
-- SELECT COUNT(*) FROM topics; -- should equal old tracks count

-- Verify modules_v2 count matches old modules count
-- SELECT COUNT(*) FROM modules_v2; -- should equal old modules count

-- Verify questions count matches old items count
-- SELECT COUNT(*) FROM questions; -- should equal old items count

-- Verify all learner_levels have valid topic_id
-- SELECT COUNT(*) FROM learner_levels ll
-- LEFT JOIN topics t ON t.id = ll.topic_id
-- WHERE t.id IS NULL; -- should be 0

-- Verify all certificates have valid topic_id
-- SELECT COUNT(*) FROM certificates c
-- LEFT JOIN topics t ON t.id = c.topic_id
-- WHERE t.id IS NULL; -- should be 0

-- Verify all attempts have valid question_id
-- SELECT COUNT(*) FROM attempts a
-- LEFT JOIN questions q ON q.id = a.question_id
-- WHERE q.id IS NULL; -- should be 0

COMMIT;

------------------------------------------------------------------------------
-- Rollback plan (if migration fails)
------------------------------------------------------------------------------

-- To rollback:
-- 1. ROLLBACK; (if in same transaction)
-- 2. Or rename tables back:
--    ALTER TABLE items_legacy RENAME TO items;
--    ALTER TABLE modules_legacy RENAME TO modules;
--    ALTER TABLE plans_legacy RENAME TO plans;
--    ALTER TABLE tracks_legacy RENAME TO tracks;
--    ALTER TABLE team_track_subscriptions_legacy RENAME TO team_track_subscriptions;
-- 3. Drop new tables:
--    DROP TABLE topic_communications CASCADE;
--    DROP TABLE topic_secondary_sources CASCADE;
--    DROP TABLE topic_citations CASCADE;
--    DROP TABLE topic_assignments CASCADE;
--    DROP TABLE questions CASCADE;
--    DROP TABLE quizzes CASCADE;
--    DROP TABLE modules_v2 CASCADE;
--    DROP TABLE topics CASCADE;
--    DROP TABLE subjects CASCADE;
-- 4. Rename columns back:
--    ALTER TABLE learner_levels RENAME COLUMN topic_id TO track_id;
--    ALTER TABLE certificates RENAME COLUMN topic_id TO track_id;
--    ALTER TABLE attempts RENAME COLUMN question_id TO item_id;
--    (and other analytics tables)

