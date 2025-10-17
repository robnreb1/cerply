-- Migration: Agent Conversations
-- Epic 13: Store conversation history for agent orchestrator
-- 30-day retention with automatic cleanup

CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tool_calls JSONB, -- Array of tool calls made (if any)
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_agent_conversations_user_id ON agent_conversations(user_id, timestamp DESC);
CREATE INDEX idx_agent_conversations_conversation_id ON agent_conversations(conversation_id);
CREATE INDEX idx_agent_conversations_timestamp ON agent_conversations(timestamp);

-- Comments for documentation
COMMENT ON TABLE agent_conversations IS 'Stores conversation history for agent orchestrator (30-day retention)';
COMMENT ON COLUMN agent_conversations.role IS 'Message role: user (user input), assistant (agent response), system (internal marker)';
COMMENT ON COLUMN agent_conversations.tool_calls IS 'JSON array of tool calls executed (if any)';
COMMENT ON COLUMN agent_conversations.conversation_id IS 'Groups messages into conversation threads';

