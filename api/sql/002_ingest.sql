-- 002_ingest.sql
CREATE TABLE IF NOT EXISTS artefact_chunks (
  id            TEXT PRIMARY KEY,
  artefact_id   TEXT NOT NULL REFERENCES artefacts(id) ON DELETE CASCADE,
  idx           INT  NOT NULL,
  content       TEXT NOT NULL,
  char_start    INT  NOT NULL,
  char_end      INT  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chunks_artefact ON artefact_chunks (artefact_id, idx);
