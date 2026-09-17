-- 024: Multi-country project creation wizard schema additions
-- Additive migration — preserves all existing projects and links

-- 1. Add per-country rates, currency, quotas, URLs and metadata to project_countries
ALTER TABLE project_countries
  ADD COLUMN IF NOT EXISTS client_rate DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vendor_rate DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS target_completes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS survey_url TEXT,
  ADD COLUMN IF NOT EXISTS est_loi INTEGER,
  ADD COLUMN IF NOT EXISTS fieldwork_days INTEGER,
  ADD COLUMN IF NOT EXISTS uid_param TEXT,
  ADD COLUMN IF NOT EXISTS uid_placeholder TEXT;

-- 2. Add base survey URL and callback URL base to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS base_survey_url TEXT,
  ADD COLUMN IF NOT EXISTS callback_url_base TEXT;

-- 3. Add vendor_cpi to project_links if not already present
ALTER TABLE project_links
  ADD COLUMN IF NOT EXISTS vendor_cpi DECIMAL(10,2) DEFAULT 0;

-- Comments for schema documentation
COMMENT ON COLUMN project_countries.client_rate IS 'Per-country client billing rate per approved complete';
COMMENT ON COLUMN project_countries.vendor_rate IS 'Per-country baseline vendor payout rate per complete';
COMMENT ON COLUMN project_countries.currency IS 'ISO 4217 currency code for country rates (USD, INR, EUR, etc.)';
COMMENT ON COLUMN project_countries.target_completes IS 'Country-specific target number of completes';
COMMENT ON COLUMN project_countries.survey_url IS 'Country-specific client survey destination URL';
COMMENT ON COLUMN project_countries.est_loi IS 'Estimated Length of Interview in minutes';
COMMENT ON COLUMN project_countries.fieldwork_days IS 'Planned fieldwork duration in days';
COMMENT ON COLUMN projects.base_survey_url IS 'Project-wide default base survey URL';
COMMENT ON COLUMN projects.callback_url_base IS 'Configured callback endpoint base for postback handling';
