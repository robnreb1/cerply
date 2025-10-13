------------------------------------------------------------------------------
-- Epic 8: Conversational Learning Interface
-- BRD: L-12 (Conversational interface), L-18 (Free-text answers)
-- FSD: Will be added as new section post-§28 upon Epic 8 completion
-- Roadmap: docs/MVP_B2B_ROADMAP.md (Epic 8, lines 787-926)
------------------------------------------------------------------------------

-- Chat sessions: tracks conversations for context and history
CREATE TABLE IF NOT EXISTS chat_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);

-- Chat messages: stores individual messages in conversations
CREATE TABLE IF NOT EXISTS chat_messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role                TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content             TEXT NOT NULL,
  intent              TEXT, -- 'progress', 'next', 'explanation', 'filter', 'help'
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);

-- Confusion tracking: logs when learners are confused for adaptive difficulty signals
CREATE TABLE IF NOT EXISTS confusion_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id         UUID NOT NULL, -- References items table (not enforced FK for flexibility)
  query               TEXT NOT NULL,
  explanation_provided TEXT NOT NULL,
  helpful             BOOLEAN,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_confusion_log_user ON confusion_log(user_id);
CREATE INDEX IF NOT EXISTS idx_confusion_log_question ON confusion_log(question_id);
CREATE INDEX IF NOT EXISTS idx_confusion_log_helpful ON confusion_log(helpful) WHERE helpful IS NOT NULL;

-- Extend attempts table to support free-text answers and partial credit
-- Note: answerIndex can be NULL when free-text is used
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS answer_text TEXT;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS partial_credit NUMERIC(3, 2); -- 0.00 to 1.00
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS validation_method TEXT; -- 'mcq', 'fuzzy', 'llm'

