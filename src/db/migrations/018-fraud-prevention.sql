-- Migration 018: Duplicate Entry Blocker and Unverified Hits Visibility

-- 1. Add fraud settings to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS block_duplicate_ip BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS block_duplicate_uid BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS soft_duplicate_mode BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS block_tone VARCHAR(32) DEFAULT 'RUDE',
  ADD COLUMN IF NOT EXISTS allow_nat_ip BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS custom_ip_message TEXT,
  ADD COLUMN IF NOT EXISTS custom_uid_message TEXT;

-- 2. Create blocked_entry_attempts table
CREATE TABLE IF NOT EXISTS blocked_entry_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  country_code VARCHAR(10),
  block_type VARCHAR(20) NOT NULL, -- 'IP' | 'UID'
  value_hash VARCHAR(128) NOT NULL,
  raw_value VARCHAR(255),
  reason VARCHAR(255) NOT NULL,
  reference_id VARCHAR(64) NOT NULL UNIQUE,
  ip_address VARCHAR(128),
  ip_hash VARCHAR(128),
  user_agent TEXT,
  tone VARCHAR(32) DEFAULT 'RUDE',
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  is_unblocked BOOLEAN DEFAULT FALSE,
  unblocked_at TIMESTAMPTZ,
  unblocked_by VARCHAR(128)
);

-- 3. Create IP Access Rules table (Whitelists & Permanent Blocks)
CREATE TABLE IF NOT EXISTS ip_access_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address VARCHAR(128) NOT NULL,
  ip_hash VARCHAR(128) NOT NULL,
  rule_type VARCHAR(20) NOT NULL, -- 'WHITELIST' | 'BLACKLIST'
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  reason TEXT,
  created_by VARCHAR(128) DEFAULT 'operator',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_ip_rule UNIQUE (ip_hash, rule_type, project_id)
);

-- 4. Triage Columns for fake_click_events (Unverified Hits)
ALTER TABLE fake_click_events
  ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(128),
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- 5. Indexes for fast lookup during tracking redirect resolution
CREATE INDEX IF NOT EXISTS idx_sessions_proj_ip ON sessions ((metadata_json->>'project_id'), ip_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_proj_uid ON sessions ((metadata_json->>'project_id'), normalized_uid);
CREATE INDEX IF NOT EXISTS idx_responses_proj_status ON responses (project_id, final_status);
CREATE INDEX IF NOT EXISTS idx_blocked_attempts_proj ON blocked_entry_attempts (project_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_blocked_attempts_ref ON blocked_entry_attempts (reference_id);
CREATE INDEX IF NOT EXISTS idx_fake_clicks_reviewed ON fake_click_events (is_reviewed, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fake_clicks_project ON fake_click_events (project_id, created_at DESC);
