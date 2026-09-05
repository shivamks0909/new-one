-- 017: Complete Finance Module — Rejection Management + Vendor Settlement + Invoice Enhancement
-- Prerequisite: migrations 014 (response-review), 015 (finance-rates), 016 (invoices) must be applied first.

-- Rejection Reasons Config
CREATE TABLE IF NOT EXISTS rejection_reasons (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO rejection_reasons (code, label, sort_order) VALUES
  ('DUPLICATE',          'Duplicate',            1),
  ('INVALID_RESPONDENT', 'Invalid Respondent',    2),
  ('QUALITY_ISSUE',      'Quality Issue',         3),
  ('FRAUD',              'Fraud/Suspicious',      4),
  ('INCOMPLETE',         'Incomplete',            5),
  ('CLIENT_REJECTION',   'Client Rejection',      6),
  ('OTHER',              'Other',                 7)
ON CONFLICT (code) DO NOTHING;

-- Vendor Settlements
CREATE TABLE IF NOT EXISTS vendor_settlements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES projects(id),
  vendor_id TEXT NOT NULL REFERENCES vendors(id),
  vendor_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_submitted INTEGER NOT NULL DEFAULT 0,
  total_accepted  INTEGER NOT NULL DEFAULT 0,
  total_rejected  INTEGER NOT NULL DEFAULT 0,
  accepted_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  rejected_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  payable_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  generated_by TEXT REFERENCES users(id),
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  finalized_at TIMESTAMP,
  paid_at TIMESTAMP,
  notes TEXT,
  UNIQUE(project_id, vendor_id)
);

-- Add project_id to responses if not present
ALTER TABLE responses ADD COLUMN IF NOT EXISTS project_id TEXT REFERENCES projects(id);

-- Add raised_at to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS raised_at TIMESTAMP;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_responses_client_billing_status ON responses(client_billing_status);
CREATE INDEX IF NOT EXISTS idx_responses_vendor_acceptance_status ON responses(vendor_acceptance_status);
CREATE INDEX IF NOT EXISTS idx_responses_project_id ON responses(project_id);
CREATE INDEX IF NOT EXISTS idx_vendor_settlements_project_id ON vendor_settlements(project_id);
CREATE INDEX IF NOT EXISTS idx_vendor_settlements_vendor_id ON vendor_settlements(vendor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_rate_audit_project_id ON rate_audit(project_id);
