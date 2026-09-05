-- Migration 006: RBAC vendor isolation fix + hardening

DROP POLICY IF EXISTS vendor_select_own_responses ON responses;
CREATE POLICY vendor_select_own_responses ON responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role = 'VENDOR'
        AND u.status = ''ACTIVE''
        AND u.vendor_id IS NOT NULL
        AND u.vendor_id = responses.vendor_id
    )
  );

DROP POLICY IF EXISTS vendor_write_responses ON responses;
CREATE POLICY vendor_write_responses ON responses
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ''ADMIN'')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ''ADMIN'')
  );

DROP POLICY IF EXISTS vendor_select_own_sessions ON sessions;
CREATE POLICY vendor_select_own_sessions ON sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role = ''VENDOR''
        AND u.status = ''ACTIVE''
        AND u.vendor_id = sessions.vendor_id
    )
  );

DROP POLICY IF EXISTS vendor_write_sessions ON sessions;
CREATE POLICY vendor_write_sessions ON sessions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ''ADMIN'')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ''ADMIN'')
  );

DROP POLICY IF EXISTS authenticated_select_audit_logs_default ON audit_logs;
DROP POLICY IF EXISTS admin_select_all_audit_logs ON audit_logs;
CREATE POLICY admin_select_all_audit_logs ON audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ''ADMIN'')
  );

DROP POLICY IF EXISTS admin_write_audit_logs ON audit_logs;
CREATE POLICY admin_write_audit_logs ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ''ADMIN'')
  );

DROP POLICY IF EXISTS admin_manage_vendor_users ON users;
DROP POLICY IF EXISTS admin_select_all_users ON users;
CREATE POLICY admin_select_all_users ON users
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ''ADMIN'')
  );

DROP POLICY IF EXISTS vendor_self_select ON users;
CREATE POLICY vendor_self_select ON users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS admin_write_users ON users;
CREATE POLICY admin_write_users ON users
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ''ADMIN'')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ''ADMIN'')
  );

DROP POLICY IF EXISTS vendor_select_assigned_studies ON studies;
CREATE POLICY vendor_select_assigned_studies ON studies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role = ''VENDOR''
        AND u.status = ''ACTIVE''
        AND u.vendor_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM study_vendors sv
          WHERE sv.study_id = studies.id AND sv.vendor_id = u.vendor_id
        )
    )
  );

DROP POLICY IF EXISTS admin_write_studies ON studies;
CREATE POLICY admin_write_studies ON studies
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ''ADMIN'')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ''ADMIN'')
  );

DROP POLICY IF EXISTS vendor_select_own_tracking_links ON tracking_links;
CREATE POLICY vendor_select_own_tracking_links ON tracking_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role = ''VENDOR''
        AND u.status = ''ACTIVE''
        AND u.vendor_id = tracking_links.vendor_id
    )
  );

DROP POLICY IF EXISTS admin_write_tracking_links ON tracking_links;
CREATE POLICY admin_write_tracking_links ON tracking_links
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ''ADMIN'')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ''ADMIN'')
  );

DROP POLICY IF EXISTS admin_write_vendors ON vendors;
CREATE POLICY admin_write_vendors ON vendors
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ''ADMIN'')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ''ADMIN'')
  );

DROP POLICY IF EXISTS admin_write_clients ON clients;
CREATE POLICY admin_write_clients ON clients
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ''ADMIN'')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ''ADMIN'')
  );

DROP POLICY IF EXISTS admin_write_quotas ON quotas;
CREATE POLICY admin_write_quotas ON quotas
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ''ADMIN'')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ''ADMIN'')
  );

DROP POLICY IF EXISTS admin_write_response_events ON response_events;
CREATE POLICY admin_write_response_events ON response_events
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ''ADMIN'')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = ''ADMIN'')
  );
