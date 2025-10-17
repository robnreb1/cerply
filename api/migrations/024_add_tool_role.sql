-- Migration: Add 'tool' role to agent_conversations
-- Epic 13: Fix OpenAI function calling API compliance
-- Tool results should be stored as role='tool' with tool_call_id

-- Drop the existing CHECK constraint
ALTER TABLE agent_conversations DROP CONSTRAINT IF EXISTS agent_conversations_role_check;

-- Add new CHECK constraint including 'tool' role
ALTER TABLE agent_conversations ADD CONSTRAINT agent_conversations_role_check 
  CHECK (role IN ('user', 'assistant', 'system', 'tool'));

-- Add tool_call_id column for tool messages
ALTER TABLE agent_conversations ADD COLUMN IF NOT EXISTS tool_call_id TEXT;

-- Update comment
COMMENT ON COLUMN agent_conversations.role IS 'Message role: user (user input), assistant (agent response), system (internal marker), tool (tool result)';
COMMENT ON COLUMN agent_conversations.tool_call_id IS 'Tool call ID for role=tool messages (links tool result to tool call)';

