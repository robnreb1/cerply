-- Migration: Complete UUID conversion for staging
-- Converts all user_id references from TEXT to UUID

-- Step 1: Drop ALL foreign key constraints to users
ALTER TABLE agent_conversations DROP CONSTRAINT IF EXISTS agent_conversations_user_id_fkey;
ALTER TABLE agent_tool_calls DROP CONSTRAINT IF EXISTS agent_tool_calls_user_id_fkey;
ALTER TABLE batch_jobs DROP CONSTRAINT IF EXISTS batch_jobs_approved_by_fkey;
ALTER TABLE user_conversations DROP CONSTRAINT IF EXISTS user_conversations_user_id_fkey;
ALTER TABLE user_workflow_decisions DROP CONSTRAINT IF EXISTS user_workflow_decisions_user_id_fkey;
ALTER TABLE verification_flags DROP CONSTRAINT IF EXISTS verification_flags_resolved_by_fkey;

-- Step 2: Convert batch_jobs.approved_by (TEXT -> UUID)
-- Set NULLs for non-UUID values (it's nullable)
UPDATE batch_jobs 
SET approved_by = NULL 
WHERE approved_by IS NOT NULL 
  AND approved_by !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

ALTER TABLE batch_jobs ALTER COLUMN approved_by TYPE UUID USING 
  CASE 
    WHEN approved_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN approved_by::UUID 
    ELSE NULL 
  END;

-- Step 3: Convert user_conversations.user_id (TEXT -> UUID)
DELETE FROM user_conversations 
WHERE user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

ALTER TABLE user_conversations ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- Step 4: Convert user_workflow_decisions.user_id (TEXT -> UUID)
DELETE FROM user_workflow_decisions 
WHERE user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

ALTER TABLE user_workflow_decisions ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- Step 5: Convert verification_flags.resolved_by (TEXT -> UUID)
UPDATE verification_flags 
SET resolved_by = NULL 
WHERE resolved_by IS NOT NULL 
  AND resolved_by !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

ALTER TABLE verification_flags ALTER COLUMN resolved_by TYPE UUID USING 
  CASE 
    WHEN resolved_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN resolved_by::UUID 
    ELSE NULL 
  END;

-- Step 6: NOW convert users.id (TEXT -> UUID)
ALTER TABLE users ALTER COLUMN id TYPE UUID USING id::UUID;

-- Step 7: Restore ALL foreign key constraints
ALTER TABLE agent_conversations 
  ADD CONSTRAINT agent_conversations_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE agent_tool_calls 
  ADD CONSTRAINT agent_tool_calls_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE batch_jobs 
  ADD CONSTRAINT batch_jobs_approved_by_fkey 
  FOREIGN KEY (approved_by) REFERENCES users(id);

ALTER TABLE user_conversations 
  ADD CONSTRAINT user_conversations_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_workflow_decisions 
  ADD CONSTRAINT user_workflow_decisions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE verification_flags 
  ADD CONSTRAINT verification_flags_resolved_by_fkey 
  FOREIGN KEY (resolved_by) REFERENCES users(id);

-- Step 8: Verify migration
DO $$
DECLARE
  users_type TEXT;
  agent_conv_type TEXT;
  agent_tool_type TEXT;
  batch_jobs_type TEXT;
  user_conv_type TEXT;
  user_workflow_type TEXT;
  verify_flags_type TEXT;
BEGIN
  SELECT data_type INTO users_type FROM information_schema.columns WHERE table_name='users' AND column_name='id';
  SELECT data_type INTO agent_conv_type FROM information_schema.columns WHERE table_name='agent_conversations' AND column_name='user_id';
  SELECT data_type INTO agent_tool_type FROM information_schema.columns WHERE table_name='agent_tool_calls' AND column_name='user_id';
  SELECT data_type INTO batch_jobs_type FROM information_schema.columns WHERE table_name='batch_jobs' AND column_name='approved_by';
  SELECT data_type INTO user_conv_type FROM information_schema.columns WHERE table_name='user_conversations' AND column_name='user_id';
  SELECT data_type INTO user_workflow_type FROM information_schema.columns WHERE table_name='user_workflow_decisions' AND column_name='user_id';
  SELECT data_type INTO verify_flags_type FROM information_schema.columns WHERE table_name='verification_flags' AND column_name='resolved_by';
  
  RAISE NOTICE '=== UUID Migration Complete ===';
  RAISE NOTICE 'users.id: %', users_type;
  RAISE NOTICE 'agent_conversations.user_id: %', agent_conv_type;
  RAISE NOTICE 'agent_tool_calls.user_id: %', agent_tool_type;
  RAISE NOTICE 'batch_jobs.approved_by: %', batch_jobs_type;
  RAISE NOTICE 'user_conversations.user_id: %', user_conv_type;
  RAISE NOTICE 'user_workflow_decisions.user_id: %', user_workflow_type;
  RAISE NOTICE 'verification_flags.resolved_by: %', verify_flags_type;
  
  IF users_type = 'uuid' THEN
    RAISE NOTICE '✅ Staging schema now matches main branch!';
  ELSE
    RAISE EXCEPTION '❌ Migration failed - users.id is still %', users_type;
  END IF;
END $$;

COMMENT ON TABLE users IS 'UUID schema (staging migrated to match main branch PR #940)';

