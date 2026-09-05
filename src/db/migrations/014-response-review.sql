-- 014: Response acceptance/rejection management

-- Add billing/vendor/rejection fields to responses table
ALTER TABLE responses ADD COLUMN IF NOT EXISTS client_billing_status VARCHAR(20) DEFAULT 'PENDING';
ALTER TABLE responses ADD COLUMN IF NOT EXISTS vendor_acceptance_status VARCHAR(20) DEFAULT 'PENDING';
ALTER TABLE responses ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(100);
ALTER TABLE responses ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id);
ALTER TABLE responses ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE responses ADD COLUMN IF NOT EXISTS rejection_notes TEXT;

-- Validations for client_billing_status
COMMENT ON COLUMN responses.client_billing_status IS 'PENDING, APPROVED, REJECTED';

-- Validations for vendor_acceptance_status
COMMENT ON COLUMN responses.vendor_acceptance_status IS 'PENDING, ACCEPTED, REJECTED';

-- Validations for rejection_reason
COMMENT ON COLUMN responses.rejection_reason IS 'DUPLICATE, INVALID_RESPONDENT, QUALITY_ISSUE, FRAUD, INCOMPLETE, CLIENT_REJECTION, OTHER';