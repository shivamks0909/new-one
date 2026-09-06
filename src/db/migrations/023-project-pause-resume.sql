-- Migration 023: Project Pause / Resume Support & Status Indexing

-- 1. Create index on projects(status) for fast filtering and lookup
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects (status);

-- 2. Migrate existing DRAFT or NULL projects to ACTIVE so they are operational
UPDATE projects
SET status = 'ACTIVE', updated_at = NOW()
WHERE status = 'DRAFT' OR status IS NULL;

-- 3. Also ensure any matching studies have consistent status
UPDATE studies s
SET status = 'LIVE', updated_at = NOW()
FROM projects p
WHERE s.study_code = p.project_code AND (s.status = 'DRAFT' OR s.status IS NULL);
