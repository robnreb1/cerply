------------------------------------------------------------------------------
-- Event sink (observability)
CREATE TABLE IF NOT EXISTS events (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  TEXT,
  type     TEXT NOT NULL,
  payload  JSONB,
  ts       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_type_ts ON events(type, ts);

-- Cost ledger for LLM calls
CREATE TABLE IF NOT EXISTS gen_ledger (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id    TEXT,
  model_used TEXT NOT NULL,
  cost_cents INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gen_ledger_model ON gen_ledger(model_used, created_at);
------------------------------------------------------------------------------

