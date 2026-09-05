-- 020: Project survey configuration
-- Adds client_name, survey_url, uid_param, uid_placeholder to projects
-- Also adds updated_at column to project_countries for change tracking

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS survey_url TEXT,
  ADD COLUMN IF NOT EXISTS uid_param TEXT,
  ADD COLUMN IF NOT EXISTS uid_placeholder TEXT;

-- Fast lookup by project_code (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_projects_code_upper ON projects (UPPER(project_code));

-- updated_at on project_countries (needed for /track country status check)
ALTER TABLE project_countries
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

-- updated_at on project_links (needed for link status checks)
ALTER TABLE project_links
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Comment for documentation
COMMENT ON COLUMN projects.client_name IS 'Client company name for this project';
COMMENT ON COLUMN projects.survey_url IS 'Raw client survey URL as pasted by admin - source of truth';
COMMENT ON COLUMN projects.uid_param IS 'Detected query parameter name that carries the UID (e.g. zid)';
COMMENT ON COLUMN projects.uid_placeholder IS 'Detected placeholder in URL for UID substitution (e.g. [identifier])';
