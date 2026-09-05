-- 015: Finance management — project rates + calculations

-- Add rates + currency to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_rate DECIMAL(10,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS vendor_rate DECIMAL(10,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Rate audit history table
CREATE TABLE IF NOT EXISTS rate_audit (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  field VARCHAR(20) NOT NULL, -- 'client_rate' or 'vendor_rate'
  old_value DECIMAL(10,2),
  new_value DECIMAL(10,2),
  changed_by INTEGER REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT NOW()
);

-- Comment
COMMENT ON COLUMN projects.client_rate IS 'Rate charged to client per approved complete';
COMMENT ON COLUMN projects.vendor_rate IS 'Rate paid to vendor per accepted complete';
COMMENT ON COLUMN projects.currency IS 'Currency code (USD, EUR, etc.)';
COMMENT ON COLUMN rate_audit IS 'History of rate changes for audit trail';