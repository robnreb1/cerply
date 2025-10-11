-- Migration: Audit Events Persistence
-- Epic 7: Gamification Polish
-- Store audit events for compliance and observability

CREATE TABLE IF NOT EXISTS audit_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type        TEXT NOT NULL,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE,
  performed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  request_id        TEXT,
  metadata          JSONB,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying and cleanup
CREATE INDEX IF NOT EXISTS idx_audit_events_user ON audit_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_org ON audit_events(organization_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_type ON audit_events(event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_occurred ON audit_events(occurred_at DESC); -- For cleanup cron

COMMENT ON TABLE audit_events IS 'Epic 7: Persistent audit trail for compliance and observability (180-day retention)';
COMMENT ON COLUMN audit_events.occurred_at IS 'Timestamp when the event occurred (indexed for cleanup)';

