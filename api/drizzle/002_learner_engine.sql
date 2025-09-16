------------------------------------------------------------------------------
-- Attempts (one row per try)
CREATE TABLE IF NOT EXISTS attempts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  item_id     TEXT NOT NULL,
  answer_index INT,
  correct     BOOLEAN NOT NULL,
  time_ms     INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Review schedule (next due + strength per user/item)
CREATE TABLE IF NOT EXISTS review_schedule (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL,
  item_id       TEXT NOT NULL,
  next_at       TIMESTAMPTZ NOT NULL,
  strength_score REAL NOT NULL DEFAULT 0.3,
  UNIQUE (user_id, item_id)
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_attempts_item ON attempts (item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_schedule_next ON review_schedule (next_at);
CREATE INDEX IF NOT EXISTS idx_review_schedule_user ON review_schedule (user_id, next_at);
------------------------------------------------------------------------------

