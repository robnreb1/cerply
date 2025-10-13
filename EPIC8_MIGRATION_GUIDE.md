# Epic 8 Migration Guide

The Epic 8 migration is ready but needs to be applied to your database. Since the Drizzle migration system has conflicting state, here are your options:

## Option 1: Manual SQL Application (Simplest)

Copy and paste this SQL directly into your PostgreSQL database:

```sql
------------------------------------------------------------------------------
-- Epic 8: Conversational Learning Interface
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

-- Extend attempts table
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS answer_text TEXT;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS partial_credit NUMERIC(3, 2);
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS validation_method TEXT;
```

## Option 2: Using psql Command Line

If you have `psql` installed and your DATABASE_URL configured:

```bash
# Set your DATABASE_URL
export DATABASE_URL="postgresql://user:password@host:port/database"

# Apply the migration
psql $DATABASE_URL -f api/drizzle/014_conversational_ui.sql
```

## Option 3: Using the Node.js Script

```bash
# Set your DATABASE_URL
export DATABASE_URL="postgresql://user:password@host:port/database"

# Run the migration script
cd api && node scripts/apply-epic8-db.js
```

## Option 4: Using Your Database GUI

If you use a database GUI tool (pgAdmin, TablePlus, DBeaver, etc.):

1. Connect to your database
2. Open a SQL query window
3. Copy and paste the SQL from Option 1 above
4. Execute the query

## Verification

After applying the migration, verify it worked:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('chat_sessions', 'chat_messages', 'confusion_log');

-- Check attempts table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'attempts' 
AND column_name IN ('answer_text', 'partial_credit', 'feedback', 'validation_method');
```

You should see:
- 3 new tables: `chat_sessions`, `chat_messages`, `confusion_log`
- 4 new columns in `attempts`: `answer_text`, `partial_credit`, `feedback`, `validation_method`

## Next Steps

Once the migration is applied:

1. **Test the API:**
   ```bash
   cd api
   FF_CONVERSATIONAL_UI_V1=true \
   FF_FREE_TEXT_ANSWERS_V1=true \
   OPENAI_API_KEY=your-key \
   npm run dev
   ```

2. **Run the tests:**
   ```bash
   cd api
   npm run test tests/intent-router.test.ts
   ./scripts/smoke-chat.sh
   ```

3. **Test the UI:**
   ```bash
   cd web
   NEXT_PUBLIC_CONVERSATIONAL_UI_V1=true npm run dev
   ```

## Troubleshooting

### "Table already exists" errors
These are safe to ignore - it means the tables were created previously. The `IF NOT EXISTS` clauses ensure the SQL is idempotent.

### "Column already exists" errors  
Also safe to ignore - the `ADD COLUMN IF NOT EXISTS` clauses make this safe to run multiple times.

### Foreign key errors
Ensure the `users` and `items` tables exist first (they should from previous migrations).

## Questions?

See `EPIC8_DELIVERY_SUMMARY.md` for full implementation details.

