-- Migration: 019_welcome_workflow.sql
-- Purpose: Add tables for learner welcome workflow state management
-- Epic: Welcome Workflow (Learner entry point with intelligent routing)
-- Dependencies: Existing users, topics, modules tables

-- Up Migration
-- ============================================================================

-- Table: user_conversations
-- Purpose: Store full conversation history for 30 days
CREATE TABLE IF NOT EXISTS user_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  messages JSONB NOT NULL, -- Array of { role, content, timestamp }
  workflow_id TEXT NOT NULL, -- 'learner_welcome', 'module', 'build', etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: user_workflow_decisions
-- Purpose: Store decision points after 30-day pruning
CREATE TABLE IF NOT EXISTS user_workflow_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL,
  decision_point TEXT NOT NULL, -- e.g., 'confirmed_topic', 'selected_subject'
  data JSONB NOT NULL, -- Structured decision data
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_conversations_user_id ON user_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_conversations_last_active ON user_conversations(last_active);
CREATE INDEX IF NOT EXISTS idx_user_conversations_conversation_id ON user_conversations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_workflow_decisions_user_id ON user_workflow_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_decisions_workflow_id ON user_workflow_decisions(workflow_id);

-- Down Migration
-- ============================================================================

-- DROP TABLE IF EXISTS user_workflow_decisions;
-- DROP TABLE IF EXISTS user_conversations;

