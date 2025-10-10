------------------------------------------------------------------------------
-- Epic 7: Gamification & Certification System
-- BRD: L-16 (Learner progression), B-15 (Manager notifications)
-- FSD: Will be added as new section post-§27 upon Epic 7 completion
-- Roadmap: docs/MVP_B2B_ROADMAP.md (Epic 7, lines 619-785)
-- Implementation Prompt: EPIC7_IMPLEMENTATION_PROMPT.md
-- Date: 2025-10-10
------------------------------------------------------------------------------

-- Learner levels per track
CREATE TABLE IF NOT EXISTS learner_levels (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id            UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  level               TEXT NOT NULL CHECK (level IN ('novice', 'learner', 'practitioner', 'expert', 'master')),
  correct_attempts    INTEGER NOT NULL DEFAULT 0,
  leveled_up_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, track_id)
);

CREATE INDEX IF NOT EXISTS idx_learner_levels_user ON learner_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_learner_levels_track ON learner_levels(track_id);

-- Certificates with Ed25519 signatures
CREATE TABLE IF NOT EXISTS certificates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id            UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  issued_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  signature           TEXT NOT NULL,
  pdf_url             TEXT,
  verification_url    TEXT,
  UNIQUE(user_id, track_id)
);

CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_org ON certificates(organization_id);

-- Badges (predefined achievements)
CREATE TABLE IF NOT EXISTS badges (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  description         TEXT NOT NULL,
  icon                TEXT NOT NULL,
  criteria            JSONB NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Learner badges (earned)
CREATE TABLE IF NOT EXISTS learner_badges (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id            UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_learner_badges_user ON learner_badges(user_id);

-- Manager notifications
CREATE TABLE IF NOT EXISTS manager_notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  learner_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                TEXT NOT NULL CHECK (type IN ('level_up', 'certificate', 'badge', 'at_risk')),
  content             JSONB NOT NULL,
  read                BOOLEAN NOT NULL DEFAULT false,
  sent_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manager_notifications_manager ON manager_notifications(manager_id, read);
CREATE INDEX IF NOT EXISTS idx_manager_notifications_learner ON manager_notifications(learner_id);

-- Seed badges
INSERT INTO badges (slug, name, description, icon, criteria) VALUES
  ('speed-demon', 'Speed Demon', 'Answer 10 questions correctly in under 5 seconds each', '⚡', 
   '{"type":"speed","count":10,"maxSeconds":5}'::jsonb),
  ('perfectionist', 'Perfectionist', 'Answer 20 questions correctly in a row', '💯', 
   '{"type":"streak","count":20}'::jsonb),
  ('consistent', '7-Day Consistent', 'Answer at least one question every day for 7 days', '🔥', 
   '{"type":"daily_streak","days":7}'::jsonb),
  ('knowledge-sharer', 'Knowledge Sharer', 'Share 3 artefacts with your team', '🤝', 
   '{"type":"shares","count":3}'::jsonb),
  ('lifelong-learner', 'Lifelong Learner', 'Complete 5 different tracks', '📚', 
   '{"type":"tracks_completed","count":5}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Comments
COMMENT ON TABLE learner_levels IS 'Epic 7: Track learner progression per track with 5 levels (novice→master)';
COMMENT ON TABLE certificates IS 'Epic 7: Issued certificates with Ed25519 signatures for verification';
COMMENT ON TABLE badges IS 'Epic 7: Predefined achievement badges (Speed Demon, Perfectionist, etc.)';
COMMENT ON TABLE learner_badges IS 'Epic 7: Badges earned by learners';
COMMENT ON TABLE manager_notifications IS 'Epic 7: Notifications for managers about team achievements';

