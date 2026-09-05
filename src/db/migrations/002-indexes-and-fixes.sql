-- Migration 002: Indexes and Fixes
-- Adds composite indexes for performance and fixes nullable columns

-- Composite index for findSession() query (study_id, vendor_id, normalized_uid)
CREATE INDEX IF NOT EXISTS idx_sessions_study_vendor_uid
ON sessions (study_id, vendor_id, normalized_uid);

-- Composite index for idempotency check on response_events
CREATE INDEX IF NOT EXISTS idx_response_events_event_key
ON response_events (event_key);

-- Composite index for response lookups by session
CREATE INDEX IF NOT EXISTS idx_responses_session_id
ON responses (session_id);

-- Composite index for response filtering by study and vendor
CREATE INDEX IF NOT EXISTS idx_responses_study_vendor
ON responses (study_id, vendor_id);

-- Index for audit log chronological queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp
ON audit_logs (timestamp DESC);

-- Make optional columns nullable where they should be
ALTER TABLE sessions 
  ALTER COLUMN external_uid DROP NOT NULL,
  ALTER COLUMN country_detected DROP NOT NULL,
  ALTER COLUMN referrer DROP NOT NULL,
  ALTER COLUMN landing_url DROP NOT NULL;

ALTER TABLE responses 
  ALTER COLUMN rejection_reason DROP NOT NULL,
  ALTER COLUMN callback_source DROP NOT NULL,
  ALTER COLUMN first_terminal_event DROP NOT NULL,
  ALTER COLUMN terminal_at DROP NOT NULL;

-- Add comment for documentation
COMMENT ON INDEX idx_sessions_study_vendor_uid IS 'Optimizes findSession() lookups by study, vendor, and normalized UID';
COMMENT ON INDEX idx_response_events_event_key IS 'Optimizes idempotency checks for duplicate callback detection';
COMMENT ON INDEX idx_responses_session_id IS 'Optimizes response lookups by session';
COMMENT ON INDEX idx_responses_study_vendor IS 'Optimizes response filtering by study and vendor';
COMMENT ON INDEX idx_audit_logs_timestamp IS 'Optimizes audit log queries by timestamp';
