-- Migration 011: Credential Vault
-- Encrypted storage for external survey/provider credentials.
-- AES-256-GCM encryption with per-record IV, audit trail for all access.

CREATE TABLE IF NOT EXISTS credential_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES users(id),
  study_id UUID REFERENCES studies(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  label VARCHAR(255) NOT NULL,
  credential_type VARCHAR(50) NOT NULL DEFAULT 'LOGIN_PASSWORD',
  username VARCHAR(255) NOT NULL,
  encrypted_password TEXT NOT NULL,
  iv VARCHAR(64) NOT NULL,
  auth_tag VARCHAR(64) NOT NULL,
  encrypted_extra JSONB,
  notes TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  last_accessed_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credential_vault_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_entry_id UUID NOT NULL REFERENCES credential_vault(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  performed_by UUID NOT NULL REFERENCES users(id),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vault_study ON credential_vault(study_id);
CREATE INDEX IF NOT EXISTS idx_vault_vendor ON credential_vault(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vault_created_by ON credential_vault(created_by);
CREATE INDEX IF NOT EXISTS idx_vault_audit_entry ON credential_vault_audit(vault_entry_id);
CREATE INDEX IF NOT EXISTS idx_vault_audit_action ON credential_vault_audit(action);
CREATE INDEX IF NOT EXISTS idx_vault_audit_time ON credential_vault_audit(created_at DESC);