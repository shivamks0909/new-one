-- Migration 1: Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'OPERATOR',
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_vendor_id ON users(vendor_id);

-- Migration 2: Clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  notes TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_client_code ON clients(client_code);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

-- Migration 3: Vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_vendor_code ON vendors(vendor_code);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);

-- Migration 4: Studies table
CREATE TABLE IF NOT EXISTS studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_code VARCHAR(100) NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  country VARCHAR(100),
  market VARCHAR(100),
  language VARCHAR(100),
  survey_url TEXT,
  survey_platform VARCHAR(100),
  target_completes INTEGER NOT NULL DEFAULT 0,
  loi_minutes INTEGER NOT NULL DEFAULT 0,
  incidence_rate INTEGER NOT NULL DEFAULT 50,
  client_cpi NUMERIC(10, 2) NOT NULL DEFAULT 0,
  start_at TIMESTAMP WITH TIME ZONE,
  end_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  security_level VARCHAR(100) DEFAULT 'standard',
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_studies_study_code ON studies(study_code);
CREATE INDEX IF NOT EXISTS idx_studies_client_id ON studies(client_id);
CREATE INDEX IF NOT EXISTS idx_studies_status ON studies(status);
CREATE INDEX IF NOT EXISTS idx_studies_country ON studies(country);
CREATE INDEX IF NOT EXISTS idx_studies_market ON studies(market);
CREATE INDEX IF NOT EXISTS idx_studies_start_at ON studies(start_at);
CREATE INDEX IF NOT EXISTS idx_studies_end_at ON studies(end_at);

-- Migration 5: Study Vendors join table
CREATE TABLE IF NOT EXISTS study_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  vendor_cpi NUMERIC(10, 2) NOT NULL DEFAULT 0,
  target_completes INTEGER NOT NULL DEFAULT 0,
  max_completes INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  allowed_country VARCHAR(100),
  custom_start_url TEXT,
  custom_terminate_url TEXT,
  custom_quota_url TEXT,
  custom_complete_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(study_id, vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_study_vendors_study_id ON study_vendors(study_id);
CREATE INDEX IF NOT EXISTS idx_study_vendors_vendor_id ON study_vendors(vendor_id);

-- Migration 6: Tracking Links table
CREATE TABLE IF NOT EXISTS tracking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  link_code VARCHAR(100) NOT NULL UNIQUE,
  public_token VARCHAR(255) NOT NULL UNIQUE,
  base_url VARCHAR(500) NOT NULL,
  destination_url TEXT NOT NULL,
  uid_mode VARCHAR(50) NOT NULL DEFAULT 'PROVIDED_UID',
  callback_profile_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_links_study_id ON tracking_links(study_id);
CREATE INDEX IF NOT EXISTS idx_tracking_links_vendor_id ON tracking_links(vendor_id);
CREATE INDEX IF NOT EXISTS idx_tracking_links_link_code ON tracking_links(link_code);
CREATE INDEX IF NOT EXISTS idx_tracking_links_public_token ON tracking_links(public_token);
CREATE INDEX IF NOT EXISTS idx_tracking_links_status ON tracking_links(status);

-- Migration 7: Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token VARCHAR(255) NOT NULL UNIQUE,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  tracking_link_id UUID REFERENCES tracking_links(id) ON DELETE SET NULL,
  uid VARCHAR(255) NOT NULL,
  normalized_uid VARCHAR(255) NOT NULL,
  external_uid VARCHAR(255),
  ip_hash VARCHAR(64) NOT NULL,
  ip_address_encrypted_or_restricted_storage BOOLEAN NOT NULL DEFAULT TRUE,
  user_agent TEXT,
  country_detected VARCHAR(100),
  referrer TEXT,
  landing_url TEXT NOT NULL,
  initial_status VARCHAR(50) NOT NULL DEFAULT 'STARTED',
  current_status VARCHAR(50) NOT NULL DEFAULT 'STARTED',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  terminated_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_session_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_study_id ON sessions(study_id);
CREATE INDEX IF NOT EXISTS idx_sessions_vendor_id ON sessions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tracking_link_id ON sessions(tracking_link_id);
CREATE INDEX IF NOT EXISTS idx_sessions_uid ON sessions(uid);
CREATE INDEX IF NOT EXISTS idx_sessions_normalized_uid ON sessions(normalized_uid);
CREATE INDEX IF NOT EXISTS idx_sessions_current_status ON sessions(current_status);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Migration 8: Response Events table (append-only event history)
CREATE TABLE IF NOT EXISTS response_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  uid VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  source VARCHAR(255),
  raw_payload JSONB NOT NULL,
  normalized_payload JSONB,
  event_key VARCHAR(512) NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_response_events_session_id ON response_events(session_id);
CREATE INDEX IF NOT EXISTS idx_response_events_study_id ON response_events(study_id);
CREATE INDEX IF NOT EXISTS idx_response_events_vendor_id ON response_events(vendor_id);
CREATE INDEX IF NOT EXISTS idx_response_events_event_type ON response_events(event_type);
CREATE INDEX IF NOT EXISTS idx_response_events_event_key ON response_events(event_key);
CREATE INDEX IF NOT EXISTS idx_response_events_created_at ON response_events(created_at);

-- Migration 9: Response Records table (normalized current outcome)
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  uid VARCHAR(255) NOT NULL,
  final_status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS',
  first_terminal_event VARCHAR(50),
  terminal_at TIMESTAMP WITH TIME ZONE,
  is_counted BOOLEAN NOT NULL DEFAULT FALSE,
  counted_at TIMESTAMP WITH TIME ZONE,
  rejection_reason VARCHAR(255),
  callback_source VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_responses_session_id ON responses(session_id);
CREATE INDEX IF NOT EXISTS idx_responses_study_id ON responses(study_id);
CREATE INDEX IF NOT EXISTS idx_responses_vendor_id ON responses(vendor_id);
CREATE INDEX IF NOT EXISTS idx_responses_uid ON responses(uid);
CREATE INDEX IF NOT EXISTS idx_responses_final_status ON responses(final_status);
CREATE INDEX IF NOT EXISTS idx_responses_is_counted ON responses(is_counted);
CREATE INDEX IF NOT EXISTS idx_responses_terminal_at ON responses(terminal_at);

-- Migration 10: Quotas table
CREATE TABLE IF NOT EXISTS quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  target INTEGER NOT NULL DEFAULT 0,
  achieved INTEGER NOT NULL DEFAULT 0,
  remaining INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
  criteria_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotas_study_id ON quotas(study_id);
CREATE INDEX IF NOT EXISTS idx_quotas_status ON quotas(status);

-- Migration 11: Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  "user" VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  before JSONB,
  after JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip INET
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Service role full access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_users') THEN
    CREATE POLICY service_role_all_users ON users FOR ALL TO service_role USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_clients') THEN
    CREATE POLICY service_role_all_clients ON clients FOR ALL TO service_role USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_vendors') THEN
    CREATE POLICY service_role_all_vendors ON vendors FOR ALL TO service_role USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_studies') THEN
    CREATE POLICY service_role_all_studies ON studies FOR ALL TO service_role USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_study_vendors') THEN
    CREATE POLICY service_role_all_study_vendors ON study_vendors FOR ALL TO service_role USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_tracking_links') THEN
    CREATE POLICY service_role_all_tracking_links ON tracking_links FOR ALL TO service_role USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_sessions') THEN
    CREATE POLICY service_role_all_sessions ON sessions FOR ALL TO service_role USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_response_events') THEN
    CREATE POLICY service_role_all_response_events ON response_events FOR ALL TO service_role USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_responses') THEN
    CREATE POLICY service_role_all_responses ON responses FOR ALL TO service_role USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_quotas') THEN
    CREATE POLICY service_role_all_quotas ON quotas FOR ALL TO service_role USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_audit_logs') THEN
    CREATE POLICY service_role_all_audit_logs ON audit_logs FOR ALL TO service_role USING (true);
  END IF;
END $$;

-- 2. Authenticated users access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_select_clients') THEN
    CREATE POLICY authenticated_select_clients ON clients FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_select_vendors') THEN
    CREATE POLICY authenticated_select_vendors ON vendors FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_select_studies') THEN
    CREATE POLICY authenticated_select_studies ON studies FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_select_responses') THEN
    CREATE POLICY authenticated_select_responses ON responses FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_select_sessions') THEN
    CREATE POLICY authenticated_select_sessions ON sessions FOR SELECT TO authenticated USING (true);
  END IF;
END $$;