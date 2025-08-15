-- === artefact_chunks (added) ===
CREATE TABLE IF NOT EXISTS artefact_chunks (
  id TEXT PRIMARY KEY,
  artefact_id TEXT NOT NULL REFERENCES artefacts(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  content TEXT NOT NULL,
  char_start INTEGER NOT NULL,
  char_end INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS artefact_chunks_artefact_idx
  ON artefact_chunks(artefact_id, idx);
