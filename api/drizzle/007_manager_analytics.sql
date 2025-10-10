------------------------------------------------------------------------------
-- Epic 4: Manager Dashboard - Analytics & Insights
-- BRD: B-2, B-14 | FSD: §24 Manager Dashboard & Analytics v1
------------------------------------------------------------------------------

-- Team analytics snapshots: aggregated metrics computed nightly or on-demand
CREATE TABLE IF NOT EXISTS team_analytics_snapshots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id             UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  track_id            UUID REFERENCES tracks(id) ON DELETE CASCADE, -- NULL = all-tracks aggregate
  snapshot_date       DATE NOT NULL,
  active_learners     INTEGER NOT NULL DEFAULT 0,
  total_attempts      INTEGER NOT NULL DEFAULT 0,
  correct_attempts    INTEGER NOT NULL DEFAULT 0,
  avg_comprehension   NUMERIC(5,3), -- 0.000 to 1.000
  avg_latency_ms      INTEGER,
  at_risk_count       INTEGER NOT NULL DEFAULT 0,
  completion_rate     NUMERIC(5,3), -- 0.000 to 1.000 (% of assigned items completed)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, track_id, snapshot_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_team ON team_analytics_snapshots(team_id);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_team_track ON team_analytics_snapshots(team_id, track_id);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_date ON team_analytics_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_team_date ON team_analytics_snapshots(team_id, snapshot_date);

-- Learner-level analytics: for at-risk identification and individual tracking
CREATE TABLE IF NOT EXISTS learner_analytics (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id             UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  track_id            UUID REFERENCES tracks(id) ON DELETE CASCADE, -- NULL = all-tracks aggregate
  total_attempts      INTEGER NOT NULL DEFAULT 0,
  correct_attempts    INTEGER NOT NULL DEFAULT 0,
  comprehension_rate  NUMERIC(5,3), -- correct / total (0.000 to 1.000)
  last_attempt_at     TIMESTAMPTZ,
  next_review_at      TIMESTAMPTZ, -- next scheduled review
  overdue_reviews     INTEGER NOT NULL DEFAULT 0,
  is_at_risk          BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, team_id, track_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_learner_analytics_user ON learner_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_learner_analytics_team ON learner_analytics(team_id);
CREATE INDEX IF NOT EXISTS idx_learner_analytics_team_user ON learner_analytics(team_id, user_id);
CREATE INDEX IF NOT EXISTS idx_learner_analytics_at_risk ON learner_analytics(team_id, is_at_risk) WHERE is_at_risk = true;
CREATE INDEX IF NOT EXISTS idx_learner_analytics_next_review ON learner_analytics(next_review_at) WHERE next_review_at IS NOT NULL;

-- Retention curves: spaced repetition effectiveness over time
CREATE TABLE IF NOT EXISTS retention_curves (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id             UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  track_id            UUID REFERENCES tracks(id) ON DELETE CASCADE, -- NULL = all-tracks
  day_offset          INTEGER NOT NULL, -- 0, 7, 14, 30
  retention_rate      NUMERIC(5,3), -- % of items still recalled (0.000 to 1.000)
  sample_size         INTEGER NOT NULL,
  snapshot_date       DATE NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, track_id, day_offset, snapshot_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_retention_curves_team ON retention_curves(team_id);
CREATE INDEX IF NOT EXISTS idx_retention_curves_team_day ON retention_curves(team_id, day_offset);
CREATE INDEX IF NOT EXISTS idx_retention_curves_team_date ON retention_curves(team_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_retention_curves_date ON retention_curves(snapshot_date);

-- Analytics configuration: org-level thresholds and settings
CREATE TABLE IF NOT EXISTS analytics_config (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  at_risk_min_comprehension   NUMERIC(5,3) NOT NULL DEFAULT 0.700, -- below this = at risk
  at_risk_max_overdue         INTEGER NOT NULL DEFAULT 5, -- overdue reviews > this = at risk
  cache_ttl_minutes           INTEGER NOT NULL DEFAULT 60, -- cache TTL for analytics
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- Index for config lookups
CREATE INDEX IF NOT EXISTS idx_analytics_config_org ON analytics_config(organization_id);

-- Indexes on existing tables for analytics queries (performance optimization)
CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_item_id ON attempts(item_id);
CREATE INDEX IF NOT EXISTS idx_attempts_created_at ON attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_attempts_user_created ON attempts(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_review_schedule_user_id ON review_schedule(user_id);
CREATE INDEX IF NOT EXISTS idx_review_schedule_next_at ON review_schedule(next_at);
CREATE INDEX IF NOT EXISTS idx_review_schedule_user_next ON review_schedule(user_id, next_at);

------------------------------------------------------------------------------
-- Default analytics config for existing organizations
------------------------------------------------------------------------------

INSERT INTO analytics_config (organization_id, at_risk_min_comprehension, at_risk_max_overdue, cache_ttl_minutes)
SELECT id, 0.700, 5, 60
FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM analytics_config WHERE organization_id = organizations.id
);

------------------------------------------------------------------------------
-- Down migration (commented out - uncomment to rollback)
------------------------------------------------------------------------------

-- DROP INDEX IF EXISTS idx_attempts_user_id;
-- DROP INDEX IF EXISTS idx_attempts_item_id;
-- DROP INDEX IF EXISTS idx_attempts_created_at;
-- DROP INDEX IF EXISTS idx_attempts_user_created;
-- DROP INDEX IF EXISTS idx_review_schedule_user_id;
-- DROP INDEX IF EXISTS idx_review_schedule_next_at;
-- DROP INDEX IF EXISTS idx_review_schedule_user_next;

-- DROP TABLE IF EXISTS analytics_config CASCADE;
-- DROP TABLE IF EXISTS retention_curves CASCADE;
-- DROP TABLE IF EXISTS learner_analytics CASCADE;
-- DROP TABLE IF EXISTS team_analytics_snapshots CASCADE;


