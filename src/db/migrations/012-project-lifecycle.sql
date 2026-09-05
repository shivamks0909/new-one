-- 012: Project lifecycle — DRAFT → CONFIGURING → VALIDATING → LIVE → PAUSED → CLOSED → ARCHIVED

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_code VARCHAR(50) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  client_id TEXT REFERENCES clients(id),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Valid statuses: DRAFT, CONFIGURING, VALIDATING, LIVE, PAUSED, CLOSED, ARCHIVED

CREATE TABLE IF NOT EXISTS project_countries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  country_code VARCHAR(10) NOT NULL,
  country_name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, country_code)
);

CREATE TABLE IF NOT EXISTS project_links (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  country_id TEXT NOT NULL REFERENCES project_countries(id) ON DELETE CASCADE,
  link_code VARCHAR(100) NOT NULL UNIQUE,
  link_name TEXT NOT NULL,
  url TEXT NOT NULL,
  provider_id TEXT,
  uid_mode VARCHAR(20) DEFAULT 'PROVIDED_UID',
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Uses link_vendor_assignments (existing table name matching db layer)
CREATE TABLE IF NOT EXISTS link_vendor_assignments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  link_id TEXT NOT NULL REFERENCES project_links(id) ON DELETE CASCADE,
  vendor_id TEXT NOT NULL REFERENCES vendors(id),
  vendor_cpi DECIMAL(10,2) DEFAULT 0,
  target_completes INTEGER DEFAULT 0,
  max_completes INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(link_id, vendor_id)
);

-- Quota tables (referenced by db layer generic getQuotas/updateQuota/deleteQuota)
CREATE TABLE IF NOT EXISTS project_quotas (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target INTEGER NOT NULL DEFAULT 0,
  achieved INTEGER NOT NULL DEFAULT 0,
  remaining INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  criteria_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS country_quotas (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  country_id TEXT NOT NULL REFERENCES project_countries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target INTEGER NOT NULL DEFAULT 0,
  achieved INTEGER NOT NULL DEFAULT 0,
  remaining INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  criteria_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS link_quotas (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  link_id TEXT NOT NULL REFERENCES project_links(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target INTEGER NOT NULL DEFAULT 0,
  achieved INTEGER NOT NULL DEFAULT 0,
  remaining INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  criteria_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
