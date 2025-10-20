-- Quick fix: Create module_creation_conversations table for local testing
-- This is a subset of migration 030 - just the essential table

CREATE TABLE IF NOT EXISTS module_creation_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID, -- Will add FK constraint later after manager_modules exists
  manager_id UUID NOT NULL, -- Will add FK constraint later after users table exists
  conversation_turns JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_module_creation_conversations_manager ON module_creation_conversations(manager_id);
CREATE INDEX IF NOT EXISTS idx_module_creation_conversations_status ON module_creation_conversations(status);

-- Success!
SELECT 'module_creation_conversations table created successfully' AS status;

