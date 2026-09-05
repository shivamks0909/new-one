-- 018: Finance Unverified Traffic, Invoice Snapshots & Vendor Settlement Enhancements

-- Invoices snapshot columns
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_activity INTEGER DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_verified INTEGER DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_unverified INTEGER DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_rejected INTEGER DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_pending INTEGER DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gross_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deductions DECIMAL(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR';

-- Vendor Settlements snapshot & billing period columns
ALTER TABLE vendor_settlements ADD COLUMN IF NOT EXISTS billing_period_start DATE;
ALTER TABLE vendor_settlements ADD COLUMN IF NOT EXISTS billing_period_end DATE;
ALTER TABLE vendor_settlements ADD COLUMN IF NOT EXISTS total_verified INTEGER DEFAULT 0;
ALTER TABLE vendor_settlements ADD COLUMN IF NOT EXISTS total_unverified INTEGER DEFAULT 0;
ALTER TABLE vendor_settlements ADD COLUMN IF NOT EXISTS gross_submitted_value DECIMAL(12,2) DEFAULT 0;
ALTER TABLE vendor_settlements ADD COLUMN IF NOT EXISTS rejection_deduction DECIMAL(12,2) DEFAULT 0;
ALTER TABLE vendor_settlements ADD COLUMN IF NOT EXISTS rejection_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE vendor_settlements ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR';

-- Settlement ID linkage in responses to prevent duplicate settlement
ALTER TABLE responses ADD COLUMN IF NOT EXISTS settlement_id UUID REFERENCES vendor_settlements(id);
CREATE INDEX IF NOT EXISTS idx_responses_settlement_id ON responses(settlement_id);

-- Fake click events project direct linkage for high-performance audit aggregations
ALTER TABLE fake_click_events ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);
CREATE INDEX IF NOT EXISTS idx_fake_clicks_project_id ON fake_click_events(project_id);
