------------------------------------------------------------------------------
-- Plans (high-level learning tracks)
CREATE TABLE IF NOT EXISTS plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT,
  brief       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft', -- 'draft'|'active'|'archived'
  slug        TEXT UNIQUE,                   -- stable slug for idempotent seeds
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Modules (ordered within a plan)
CREATE TABLE IF NOT EXISTS modules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  "order"     INT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_modules_plan ON modules(plan_id);

-- Items (lesson content)
CREATE TABLE IF NOT EXISTS items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id   UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,                 -- 'explainer'|'mcq'|'free'
  stem        TEXT,
  options     JSONB,
  answer      INT,
  explainer   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_items_module ON items(module_id);
------------------------------------------------------------------------------

