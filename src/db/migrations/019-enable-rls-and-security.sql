-- Migration 019: Complete RLS Enablement & Database Hardening
-- Enforces Row-Level Security across all previously unshielded tables

-- 1. Enable RLS on all 19 tables
ALTER TABLE IF EXISTS _migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS external_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS external_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS login_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fake_click_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS project_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS project_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS link_vendor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS project_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS country_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS link_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS credential_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS credential_vault_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rejection_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rate_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vendor_settlements ENABLE ROW LEVEL SECURITY;

-- 2. Service Role Policies (Backend worker / superuser full bypass)
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    '_migrations', 'external_platforms', 'external_offers', 'login_audit',
    'fake_click_events', 'projects', 'project_countries', 'project_links',
    'link_vendor_assignments', 'project_quotas', 'country_quotas', 'link_quotas',
    'credential_vault', 'credential_vault_audit', 'rejection_reasons', 'rate_audit',
    'invoices', 'invoice_line_items', 'vendor_settlements'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS service_role_all_%I ON %I;', tbl, tbl);
    EXECUTE format('CREATE POLICY service_role_all_%I ON %I FOR ALL TO service_role USING (true) WITH CHECK (true);', tbl, tbl);
  END LOOP;
END $$;

-- 3. Admin Full Access Policies (Authenticated ADMIN role)
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    '_migrations', 'external_platforms', 'external_offers', 'login_audit',
    'fake_click_events', 'projects', 'project_countries', 'project_links',
    'link_vendor_assignments', 'project_quotas', 'country_quotas', 'link_quotas',
    'credential_vault', 'credential_vault_audit', 'rejection_reasons', 'rate_audit',
    'invoices', 'invoice_line_items', 'vendor_settlements'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS admin_all_%I ON %I;', tbl, tbl);
    EXECUTE format('CREATE POLICY admin_all_%I ON %I FOR ALL TO authenticated USING (
      EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ''ADMIN'')
    ) WITH CHECK (
      EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ''ADMIN'')
    );', tbl, tbl);
  END LOOP;
END $$;

-- 4. Vendor Scoped Policies (Vendors can only see their own assigned or recorded rows)

-- Link vendor assignments
DROP POLICY IF EXISTS vendor_select_assignments ON link_vendor_assignments;
CREATE POLICY vendor_select_assignments ON link_vendor_assignments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'VENDOR' AND u.status = 'ACTIVE' AND u.vendor_id = link_vendor_assignments.vendor_id)
);

-- Fake click events (Unverified traffic recorded for vendor)
DROP POLICY IF EXISTS vendor_select_fake_clicks ON fake_click_events;
CREATE POLICY vendor_select_fake_clicks ON fake_click_events FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'VENDOR' AND u.status = 'ACTIVE' AND u.vendor_id = fake_click_events.vendor_id)
);

-- Vendor settlements (Vendors can inspect their own settlements)
DROP POLICY IF EXISTS vendor_select_own_settlements ON vendor_settlements;
CREATE POLICY vendor_select_own_settlements ON vendor_settlements FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'VENDOR' AND u.status = 'ACTIVE' AND u.vendor_id = vendor_settlements.vendor_id)
);

-- Rejection reasons (Read-only catalog for all authenticated users)
DROP POLICY IF EXISTS authenticated_select_rejection_reasons ON rejection_reasons;
CREATE POLICY authenticated_select_rejection_reasons ON rejection_reasons FOR SELECT TO authenticated USING (true);

-- Projects (Read-only for vendors who have assignments)
DROP POLICY IF EXISTS vendor_select_assigned_projects ON projects;
CREATE POLICY vendor_select_assigned_projects ON projects FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN link_vendor_assignments lva ON lva.vendor_id = u.vendor_id
    JOIN project_links pl ON pl.id = lva.link_id
    JOIN project_countries pc ON pc.id = pl.country_id
    WHERE u.id = auth.uid() AND u.role = 'VENDOR' AND pc.project_id = projects.id
  )
);
