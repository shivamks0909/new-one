-- Migration 008: Auth security enhancements
-- Adds account lockout, last login tracking, and 2FA support to users table.

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_failed_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_ip INET,
  ADD COLUMN IF NOT EXISTS last_login_user_agent TEXT,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS totp_secret TEXT,
  ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Login audit table for security investigations
CREATE TABLE IF NOT EXISTS login_audit (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email_attempted TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_audit_user ON login_audit(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_audit_ip ON login_audit(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_audit_email ON login_audit(email_attempted, created_at DESC);

COMMENT ON COLUMN users.failed_login_attempts IS 'Consecutive failed login attempts; resets on success';
COMMENT ON COLUMN users.locked_until IS 'Account locked until this timestamp after too many failures';
COMMENT ON COLUMN users.totp_secret IS 'TOTP shared secret (encrypted at rest in production)';
COMMENT ON COLUMN users.totp_enabled IS 'Whether 2FA via TOTP is enabled';
COMMENT ON TABLE login_audit IS 'Audit log for all login attempts including failures';

COMMIT;
