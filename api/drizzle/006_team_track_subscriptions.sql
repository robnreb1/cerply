------------------------------------------------------------------------------
-- Epic 3: Team Management & Learner Assignment
-- BRD: B3 Group Learning | FSD: §23 Team Management & Assignments v1
------------------------------------------------------------------------------

-- Tracks: learning tracks (canonical = org_id NULL, org-specific = org_id NOT NULL)
CREATE TABLE IF NOT EXISTS tracks (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL = canonical/shared track
  title                   TEXT NOT NULL,
  plan_ref                TEXT NOT NULL, -- e.g., 'canon:arch-std-v1' or 'plan:uuid'
  certified_artifact_id   UUID, -- references certified_artifacts if applicable
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tracks_org ON tracks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tracks_plan_ref ON tracks(plan_ref);

-- Team track subscriptions: teams subscribe to tracks with cadence
CREATE TABLE IF NOT EXISTS team_track_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  track_id    UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  cadence     TEXT NOT NULL CHECK (cadence IN ('daily', 'weekly', 'monthly')),
  start_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, track_id)
);
CREATE INDEX IF NOT EXISTS idx_team_track_sub_team ON team_track_subscriptions(team_id);
CREATE INDEX IF NOT EXISTS idx_team_track_sub_track ON team_track_subscriptions(track_id);
CREATE INDEX IF NOT EXISTS idx_team_track_sub_active ON team_track_subscriptions(active) WHERE active = true;

------------------------------------------------------------------------------
-- Seed data: 1 canonical track for testing
------------------------------------------------------------------------------

-- Canonical track (org_id = NULL)
INSERT INTO tracks (id, organization_id, title, plan_ref, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000100'::UUID,
  NULL, -- canonical track
  'Architecture Standards – Starter',
  'canon:arch-std-v1',
  now()
) ON CONFLICT (id) DO NOTHING;

------------------------------------------------------------------------------
-- Down migration
------------------------------------------------------------------------------

-- DROP TABLE IF EXISTS team_track_subscriptions CASCADE;
-- DROP TABLE IF EXISTS tracks CASCADE;


