-- Migration 004: Fix RLS for Vendor Isolation

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX OVERLY PERMISSIVE POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Remove overly permissive policies that allow ANY authenticated user to see ALL data
DROP POLICY IF EXISTS authenticated_select_responses ON responses;
DROP POLICY IF EXISTS authenticated_select_sessions ON sessions;
DROP POLICY IF EXISTS authenticated_select_studies ON studies;

-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS POLICIES FOR RESPONSES (CRITICAL FOR VENDOR ISOLATION)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Service role has full access (to recalculate everything)
DROP POLICY IF EXISTS service_role_all_responses ON responses;
CREATE POLICY service_role_all_responses ON responses
  FOR ALL TO service_role USING (true);

-- 2. Admin has full access to all responses
DROP POLICY IF EXISTS admin_select_all_responses ON responses;
CREATE POLICY admin_select_all_responses ON responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'ADMIN'
    )
  );

-- 3. Vendors can only see their own responses
DROP POLICY IF EXISTS vendor_select_own_responses ON responses;
CREATE POLICY vendor_select_own_responses ON responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'VENDOR'
      AND u.vendor_id IS NOT NULL
      AND u.vendor_id IN (
        SELECT vendor_id FROM responses WHERE vendor_id = responses.vendor_id
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS POLICIES FOR STUDIES (VENDOR ASSIGNMENT BASED)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Admin has full access to all studies
DROP POLICY IF EXISTS admin_select_all_studies ON studies;
CREATE POLICY admin_select_all_studies ON studies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'ADMIN'
    )
  );

-- 2. Vendors can only see studies assigned to their vendors
DROP POLICY IF EXISTS vendor_select_assigned_studies ON studies;
CREATE POLICY vendor_select_assigned_studies ON studies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'VENDOR'
      AND u.vendor_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM study_vendors sv
        WHERE sv.vendor_id = u.vendor_id
        AND sv.study_id = studies.id
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS POLICIES FOR SESSIONS (VENDOR ASSOCIATION BASED)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Admin has full access to all sessions
DROP POLICY IF EXISTS admin_select_all_sessions ON sessions;
CREATE POLICY admin_select_all_sessions ON sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'ADMIN'
    )
  );

-- 2. Vendors can only see sessions from their vendors
DROP POLICY IF EXISTS vendor_select_own_sessions ON sessions;
CREATE POLICY vendor_select_own_sessions ON sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'VENDOR'
      AND u.vendor_id IS NOT NULL
      AND u.vendor_id = sessions.vendor_id
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS POLICIES FOR TRACKING LINKS (VENDOR SCOPE)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Admin has full access to all tracking links
DROP POLICY IF EXISTS admin_select_all_tracking_links ON tracking_links;
CREATE POLICY admin_select_all_tracking_links ON tracking_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'ADMIN'
    )
  );

-- 2. Vendors can only see their own tracking links
DROP POLICY IF EXISTS vendor_select_own_tracking_links ON tracking_links;
CREATE POLICY vendor_select_own_tracking_links ON tracking_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'VENDOR'
      AND u.vendor_id IS NOT NULL
      AND u.vendor_id = tracking_links.vendor_id
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS POLICIES FOR VENDORS (ADMIN ONLY)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Admin has full access to vendors table
DROP POLICY IF EXISTS admin_select_all_vendors ON vendors;
CREATE POLICY admin_select_all_vendors ON vendors
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'ADMIN'
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- VENDORS TABLE MOVE FROM SELECT-ONLY TO MANAGED BY ADMIN
-- ═══════════════════════════════════════════════════════════════════════════════

-- Allow admins to view all vendors (existing policy)
DROP POLICY IF EXISTS admin_select_all_vendors ON vendors;
CREATE POLICY admin_select_all_vendors ON vendors
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'ADMIN'
    )
  );

-- Create VENDOR user creation policy (admins can create vendor users)
CREATE POLICY admin_manage_vendor_users ON users
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'ADMIN'
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON POLICY admin_select_all_responses ON responses IS 'Admin: full access to all responses';
COMMENT ON POLICY vendor_select_own_responses ON responses IS 'Vendor: only their own responses';
COMMENT ON POLICY admin_select_all_studies ON studies IS 'Admin: full access to all studies';
COMMENT ON POLICY vendor_select_assigned_studies ON studies IS 'Vendor: assigned studies only';
COMMENT ON POLICY admin_select_all_sessions ON sessions IS 'Admin: full access to all sessions';
COMMENT ON POLICY vendor_select_own_sessions ON sessions IS 'Vendor: only their sessions';
COMMENT ON POLICY admin_select_all_tracking_links ON tracking_links IS 'Admin: full access to all tracking links';
COMMENT ON POLICY vendor_select_own_tracking_links ON tracking_links IS 'Vendor: only their tracking links';
COMMENT ON POLICY admin_manage_vendor_users ON users IS 'Admin: manage vendor users';

-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS POLICIES FOR RESPONSE_EVENTS (VENDOR ISOLATION)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Service role has full access (to recalculate everything)
DROP POLICY IF EXISTS service_role_all_response_events ON response_events;
CREATE POLICY service_role_all_response_events ON response_events
  FOR ALL TO service_role USING (true);

-- 2. Admin has full access to all response_events
DROP POLICY IF EXISTS admin_select_all_response_events ON response_events;
CREATE POLICY admin_select_all_response_events ON response_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'ADMIN'
    )
  );

-- 3. Vendors can only see their own response_events
DROP POLICY IF EXISTS vendor_select_own_response_events ON response_events;
CREATE POLICY vendor_select_own_response_events ON response_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'VENDOR'
      AND u.vendor_id IS NOT NULL
      AND u.vendor_id = response_events.vendor_id
    )
  );

COMMENT ON POLICY admin_select_all_response_events ON response_events IS 'Admin: full access to all response events';
COMMENT ON POLICY vendor_select_own_response_events ON response_events IS 'Vendor: only their own response events';
