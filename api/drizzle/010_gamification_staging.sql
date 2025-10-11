-- Migration: Gamification Core Tables (Staging Version)
-- Epic 7: Gamification & Certification System
-- Simplified for staging environment (text IDs, nullable org references)

-- Learner progression levels
CREATE TABLE IF NOT EXISTS learner_levels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id        TEXT NOT NULL,  -- No FK constraint (tracks table doesn't exist in staging)
  level           TEXT NOT NULL DEFAULT 'novice',
  correct_attempts INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, track_id)
);

-- Certificates issued to learners
CREATE TABLE IF NOT EXISTS certificates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id   TEXT,  -- Nullable, no FK
  track_id          TEXT NOT NULL,
  signature         TEXT NOT NULL,
  verification_url  TEXT,
  issued_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at        TIMESTAMPTZ,
  revocation_reason TEXT
);

-- Achievement badges definitions
CREATE TABLE IF NOT EXISTS badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  icon_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Learner badge awards
CREATE TABLE IF NOT EXISTS learner_badges (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id   UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Manager notifications
CREATE TABLE IF NOT EXISTS manager_notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  content    JSONB NOT NULL,
  read       BOOLEAN NOT NULL DEFAULT false,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_learner_levels_user ON learner_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_learner_levels_track ON learner_levels(track_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_revoked ON certificates(revoked_at);
CREATE INDEX IF NOT EXISTS idx_learner_badges_user ON learner_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_manager_notifications_manager ON manager_notifications(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_notifications_read ON manager_notifications(read, sent_at DESC);

-- Seed badge data (idempotent)
INSERT INTO badges (slug, name, description) VALUES
  ('first-correct', 'First Steps', 'Answered your first question correctly'),
  ('streak-3', 'On Fire', '3-day streak'),
  ('streak-7', 'Unstoppable', '7-day streak'),
  ('perfect-5', 'Perfectionist', '5 perfect scores in a row'),
  ('early-bird', 'Early Bird', 'Completed a lesson before 9 AM'),
  ('night-owl', 'Night Owl', 'Completed a lesson after 10 PM'),
  ('track-complete', 'Track Master', 'Completed an entire track')
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE learner_levels IS 'Epic 7: User progression per track';
COMMENT ON TABLE certificates IS 'Epic 7: Issued certificates with signatures';
COMMENT ON TABLE badges IS 'Epic 7: Achievement badge definitions';
COMMENT ON TABLE learner_badges IS 'Epic 7: User badge awards';
COMMENT ON TABLE manager_notifications IS 'Epic 7: In-app notifications for managers';

