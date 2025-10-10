-- Migration: Certificate Revocation
-- Epic 7: Gamification Polish
-- Add revoked_at column and revocation_reason to certificates

ALTER TABLE certificates ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS revocation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_certificates_revoked ON certificates(revoked_at) WHERE revoked_at IS NOT NULL;

COMMENT ON COLUMN certificates.revoked_at IS 'Epic 7: Timestamp when certificate was revoked (NULL = valid)';
COMMENT ON COLUMN certificates.revocation_reason IS 'Epic 7: Reason for certificate revocation';

