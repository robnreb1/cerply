-- Migration: Idempotency Keys (Staging Version - text user_id)
-- Epic 7: Gamification Polish
-- Prevents duplicate mutations by storing request/response pairs

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key               TEXT NOT NULL,
  route             TEXT NOT NULL,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status_code       INTEGER NOT NULL,
  response_hash     TEXT NOT NULL,
  response_body     JSONB NOT NULL,
  response_headers  JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ NOT NULL
);

-- Indexes for efficient lookup and cleanup
CREATE INDEX IF NOT EXISTS idx_idempotency_key_user ON idempotency_keys(key, route, user_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);

COMMENT ON TABLE idempotency_keys IS 'Epic 7: Request deduplication (24hr TTL)';

