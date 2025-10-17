-- Migration: Convert Staging TEXT user IDs to UUID
-- This migration updates the staging database to match main branch schema (PR #940)
-- WARNING: This is a DATA migration - requires careful execution

-- Step 1: Drop foreign key constraints on Epic 13 tables
ALTER TABLE agent_conversations DROP CONSTRAINT IF EXISTS agent_conversations_user_id_fkey;
ALTER TABLE agent_tool_calls DROP CONSTRAINT IF EXISTS agent_tool_calls_user_id_fkey;

-- Step 2: Convert agent_conversations.user_id from TEXT to UUID
-- First check if all user_ids are valid UUIDs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM agent_conversations 
    WHERE user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) THEN
    RAISE EXCEPTION 'agent_conversations has non-UUID user_id values - cannot migrate';
  END IF;
END $$;

-- Convert column type
ALTER TABLE agent_conversations ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- Step 3: Convert agent_tool_calls.user_id from TEXT to UUID
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM agent_tool_calls 
    WHERE user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) THEN
    RAISE EXCEPTION 'agent_tool_calls has non-UUID user_id values - cannot migrate';
  END IF;
END $$;

ALTER TABLE agent_tool_calls ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- Step 4: Convert users.id from TEXT to UUID
-- This is the core table - all other tables reference it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) THEN
    RAISE EXCEPTION 'users table has non-UUID id values - cannot migrate';
  END IF;
END $$;

ALTER TABLE users ALTER COLUMN id TYPE UUID USING id::UUID;

-- Step 5: Restore foreign key constraints
ALTER TABLE agent_conversations 
  ADD CONSTRAINT agent_conversations_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE agent_tool_calls 
  ADD CONSTRAINT agent_tool_calls_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 6: Verify migration success
DO $$
DECLARE
  user_count INT;
  agent_conv_count INT;
  agent_tool_count INT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM users;
  SELECT COUNT(*) INTO agent_conv_count FROM agent_conversations;
  SELECT COUNT(*) INTO agent_tool_count FROM agent_tool_calls;
  
  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '  users: % records', user_count;
  RAISE NOTICE '  agent_conversations: % records', agent_conv_count;
  RAISE NOTICE '  agent_tool_calls: % records', agent_tool_count;
END $$;

-- Comments
COMMENT ON TABLE users IS 'Updated to UUID primary key (PR #940)';
COMMENT ON COLUMN agent_conversations.user_id IS 'UUID foreign key to users.id (migrated from TEXT)';
COMMENT ON COLUMN agent_tool_calls.user_id IS 'UUID foreign key to users.id (migrated from TEXT)';

