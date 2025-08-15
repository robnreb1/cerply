
CREATE TABLE IF NOT EXISTS artefacts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT,
  source_uri TEXT,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS objectives (
  id TEXT PRIMARY KEY,
  artefact_id TEXT REFERENCES artefacts(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  taxonomy TEXT[] DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  objective_id TEXT REFERENCES objectives(id) ON DELETE CASCADE,
  stem TEXT NOT NULL,
  options TEXT[] NOT NULL DEFAULT '{}',
  correct_index INT,
  correct_indices INT[] DEFAULT '{}',
  explainer TEXT NOT NULL,
  source_snippet_ref TEXT,
  difficulty NUMERIC,
  variant_group_id TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  version INT NOT NULL DEFAULT 1,
  trust_label TEXT,
  trust_mapping_refs TEXT[] DEFAULT '{}',
  assignee_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
  is_correct BOOLEAN NOT NULL,
  response_time_ms INT,
  confidence INT,
  at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS spaced_schedules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  objective_id TEXT NOT NULL,
  next_due_at TIMESTAMPTZ NOT NULL,
  interval_days INT NOT NULL,
  easing_state TEXT
);
CREATE TABLE IF NOT EXISTS qa_groups ( id TEXT PRIMARY KEY, name TEXT NOT NULL );
CREATE TABLE IF NOT EXISTS qa_group_members ( group_id TEXT REFERENCES qa_groups(id) ON DELETE CASCADE, user_id TEXT NOT NULL, role TEXT NOT NULL, PRIMARY KEY (group_id, user_id) );
