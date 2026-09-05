-- 022: Move survey_url from project level to project_links (per-country)
-- Each country now has its own client survey URL, uid_param, uid_placeholder, vendor, and target

ALTER TABLE project_links
  ADD COLUMN IF NOT EXISTS uid_param TEXT,
  ADD COLUMN IF NOT EXISTS uid_placeholder TEXT,
  ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_completes INTEGER;

-- Make project-level survey_url, uid_param, uid_placeholder optional (legacy fallback only)
COMMENT ON COLUMN projects.survey_url IS 'DEPRECATED: survey URL is now stored per-country in project_links. Kept as legacy fallback.';
COMMENT ON COLUMN project_links.uid_param IS 'Detected query parameter name for UID in this country survey URL (e.g. rid, zid)';
COMMENT ON COLUMN project_links.uid_placeholder IS 'Detected placeholder text in this country survey URL (e.g. [identifier])';
COMMENT ON COLUMN project_links.vendor_id IS 'Default vendor assigned to this country link';
COMMENT ON COLUMN project_links.target_completes IS 'Target number of completes for this country';
