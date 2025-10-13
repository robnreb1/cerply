------------------------------------------------------------------------------
-- Epic 8: Conversational Learning Interface (Staging Version)
-- Modified to work with partial database schema
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
  intent              TEXT,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);

-- Confusion tracking: logs when learners are confused
-- Note: question_id is not a foreign key since items table may not exist yet
CREATE TABLE IF NOT EXISTS confusion_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id         UUID NOT NULL,
  query               TEXT NOT NULL,
  explanation_provided TEXT NOT NULL,
  helpful             BOOLEAN,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_confusion_log_user ON confusion_log(user_id);
CREATE INDEX IF NOT EXISTS idx_confusion_log_question ON confusion_log(question_id);
CREATE INDEX IF NOT EXISTS idx_confusion_log_helpful ON confusion_log(helpful) WHERE helpful IS NOT NULL;

-- Create attempts table if it doesn't exist (for free-text answers)
CREATE TABLE IF NOT EXISTS attempts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  item_id             UUID NOT NULL,
  answer_index        INTEGER,
  answer_text         TEXT,
  correct             INTEGER NOT NULL,
  time_ms             INTEGER,
  channel             TEXT DEFAULT 'web',
  partial_credit      NUMERIC(3, 2),
  feedback            TEXT,
  validation_method   TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add new columns to attempts if table already exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'attempts') THEN
    ALTER TABLE attempts ADD COLUMN IF NOT EXISTS answer_text TEXT;
    ALTER TABLE attempts ADD COLUMN IF NOT EXISTS partial_credit NUMERIC(3, 2);
    ALTER TABLE attempts ADD COLUMN IF NOT EXISTS feedback TEXT;
    ALTER TABLE attempts ADD COLUMN IF NOT EXISTS validation_method TEXT;
  END IF;
END $$;

