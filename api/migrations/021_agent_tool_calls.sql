-- Migration: Agent Tool Calls
-- Epic 13: Audit trail for tool execution
-- Tracks performance, errors, and usage patterns

CREATE TABLE IF NOT EXISTS agent_tool_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  parameters JSONB NOT NULL,
  result JSONB,
  execution_time_ms INTEGER,
  error TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX idx_agent_tool_calls_user_id ON agent_tool_calls(user_id, timestamp DESC);
CREATE INDEX idx_agent_tool_calls_tool_name ON agent_tool_calls(tool_name, timestamp DESC);
CREATE INDEX idx_agent_tool_calls_timestamp ON agent_tool_calls(timestamp);

-- Comments for documentation
COMMENT ON TABLE agent_tool_calls IS 'Audit trail for agent tool execution (performance monitoring and debugging)';
COMMENT ON COLUMN agent_tool_calls.parameters IS 'JSON parameters passed to the tool';
COMMENT ON COLUMN agent_tool_calls.result IS 'JSON result returned by the tool (null if error)';
COMMENT ON COLUMN agent_tool_calls.execution_time_ms IS 'Time taken to execute the tool in milliseconds';
COMMENT ON COLUMN agent_tool_calls.error IS 'Error message if tool execution failed';

