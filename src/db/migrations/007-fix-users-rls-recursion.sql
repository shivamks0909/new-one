-- Fix infinite recursion in users RLS policies
-- The policies admin_select_all_users and admin_write_users on the users table
-- reference the users table itself via EXISTS subquery, which triggers
-- recursive RLS evaluation. Fix by using auth.jwt() claim instead.

BEGIN;

DROP POLICY IF EXISTS admin_select_all_users ON users;
CREATE POLICY admin_select_all_users ON users
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'ADMIN'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
    OR id = auth.uid()
  );

DROP POLICY IF EXISTS admin_write_users ON users;
CREATE POLICY admin_write_users ON users
  FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'ADMIN'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'ADMIN'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
  );

-- Also fix any other tables with self-referencing user subqueries
DROP POLICY IF EXISTS admin_select_all_audit_logs ON audit_logs;
CREATE POLICY admin_select_all_audit_logs ON audit_logs
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'ADMIN'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
  );

DROP POLICY IF EXISTS admin_write_audit_logs ON audit_logs;
CREATE POLICY admin_write_audit_logs ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'ADMIN'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
  );

COMMIT;
