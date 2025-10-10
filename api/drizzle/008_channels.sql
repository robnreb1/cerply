------------------------------------------------------------------------------
-- Epic 5: Slack Channel Integration
-- BRD: B-7, AU-1, L-17 | FSD: §25 Slack Channel Integration v1
------------------------------------------------------------------------------

-- Organization-level channel configurations
CREATE TABLE IF NOT EXISTS channels (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type                TEXT NOT NULL CHECK (type IN ('slack', 'whatsapp', 'teams', 'email')),
  config              JSONB NOT NULL, -- { slack_team_id, slack_bot_token, slack_signing_secret }
  enabled             BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, type)
);

CREATE INDEX IF NOT EXISTS idx_channels_org_type ON channels(organization_id, type);

-- User-level channel preferences
CREATE TABLE IF NOT EXISTS user_channels (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_type        TEXT NOT NULL CHECK (channel_type IN ('slack', 'whatsapp', 'teams', 'email')),
  channel_id          TEXT NOT NULL, -- Slack user ID (U123456), phone number, etc.
  preferences         JSONB, -- { quiet_hours: "22:00-07:00", paused: false }
  verified            BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel_type)
);

CREATE INDEX IF NOT EXISTS idx_user_channels_user ON user_channels(user_id);

-- Add channel tracking to attempts
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'web';
CREATE INDEX IF NOT EXISTS idx_attempts_channel ON attempts(channel);

-- Comment for audit
COMMENT ON TABLE channels IS 'Organization-level channel integrations (Slack, WhatsApp, Teams)';
COMMENT ON TABLE user_channels IS 'User-level channel preferences and quiet hours';
COMMENT ON COLUMN attempts.channel IS 'Delivery channel: web, slack, whatsapp, teams, email';

