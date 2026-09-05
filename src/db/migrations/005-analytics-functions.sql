-- Migration 005: Analytics RLS Functions for Role-Based Access

-- ─── GET STUDY ANALYTICS FUNCTION (ADMIN + VENDOR) ─────────────────────────────
CREATE OR REPLACE FUNCTION get_study_analytics(study_id_param UUID)
RETURNS TABLE (
  total_sessions BIGINT,
  completes BIGINT,
  terminates BIGINT,
  quota_full BIGINT,
  security_rejects BIGINT,
  in_progress BIGINT,
  invalid_count BIGINT,
  expired_count BIGINT,
  counted_completes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT s.id)                                                       AS total_sessions,
    COUNT(DISTINCT CASE WHEN r.final_status = 'COMPLETE' THEN r.id END)       AS completes,
    COUNT(DISTINCT CASE WHEN r.final_status = 'TERMINATE' THEN r.id END)      AS terminates,
    COUNT(DISTINCT CASE WHEN r.final_status = 'QUOTA_FULL' THEN r.id END)      AS quota_full,
    COUNT(DISTINCT CASE WHEN r.final_status = 'SECURITY_REJECT' THEN r.id END) AS security_rejects,
    COUNT(DISTINCT CASE WHEN r.final_status = 'IN_PROGRESS' THEN r.id END)     AS in_progress,
    COUNT(DISTINCT CASE WHEN r.final_status = 'INVALID' THEN r.id END)         AS invalid_count,
    COUNT(DISTINCT CASE WHEN r.final_status = 'EXPIRED' THEN r.id END)         AS expired_count,
    COUNT(DISTINCT CASE WHEN r.is_counted = true THEN r.id END)                AS counted_completes
  FROM sessions s
  LEFT JOIN responses r ON r.session_id = s.id
  WHERE s.study_id = study_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── GET VENDOR ANALYTICS FUNCTION (ADMIN ONLY) ─────────────────────────────

CREATE OR REPLACE FUNCTION get_vendor_analytics(vendor_id_param UUID)
RETURNS TABLE (
  study_id UUID,
  study_title TEXT,
  study_code TEXT,
  client_cpi NUMERIC,
  vendor_cpi NUMERIC,
  target_completes BIGINT,
  total_sessions BIGINT,
  completes BIGINT,
  terminates BIGINT,
  quota_full BIGINT,
  security_rejects BIGINT,
  counted_completes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id    AS study_id,
    s.title AS study_title,
    s.study_code,
    s.client_cpi,
    sv.vendor_cpi,
    sv.target_completes,
    COUNT(DISTINCT sess.id)                                                   AS total_sessions,
    COUNT(DISTINCT CASE WHEN r.final_status = 'COMPLETE' THEN r.id END)       AS completes,
    COUNT(DISTINCT CASE WHEN r.final_status = 'TERMINATE' THEN r.id END)      AS terminates,
    COUNT(DISTINCT CASE WHEN r.final_status = 'QUOTA_FULL' THEN r.id END)      AS quota_full,
    COUNT(DISTINCT CASE WHEN r.final_status = 'SECURITY_REJECT' THEN r.id END) AS security_rejects,
    COUNT(DISTINCT CASE WHEN r.is_counted = true THEN r.id END)                AS counted_completes
  FROM study_vendors sv
  JOIN studies s ON s.id = sv.study_id
  LEFT JOIN sessions sess ON sess.study_id = sv.study_id AND sess.vendor_id = sv.vendor_id
  LEFT JOIN responses r ON r.session_id = sess.id
  WHERE sv.vendor_id = vendor_id_param
  GROUP BY s.id, s.title, s.study_code, s.client_cpi, sv.vendor_cpi, sv.target_completes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── SECURITY DEFINER GRANTS ─────────────────────────────────────────────────

-- Authenticated users (auth.uid())
CREATE POLICY auth_query_get_study_analytics ON FUNCTION get_study_analytics(UUID)
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (u.role = 'ADMIN' OR u.role = 'VENDOR')
      AND (
        u.role = 'ADMIN'
        OR EXISTS (
          SELECT 1 FROM study_vendors sv
          WHERE sv.vendor_id = u.vendor_id
          AND sv.study_id = study_id_param
        )
      )
    )
  );

-- Authenticated users (auth.uid())
CREATE POLICY auth_query_get_vendor_analytics ON FUNCTION get_vendor_analytics(UUID)
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'ADMIN'
    )
  );

-- ─── REPLACEMENT OF OVERLY PERMISSIVE SELECT POLICIES ─────────────────────────

-- Admin can query surveys list directly
STRICT RENAME POLICY admin_read_all_surveys ON responses TO admin_query_responses;

-- Drop overly permissive policies that allow ANY authenticated user
DROP POLICY IF EXISTS authenticated_select_responses ON responses;
DROP POLICY IF EXISTS authenticated_select_sessions ON sessions;
DROP POLICY IF EXISTS authenticated_select_studies ON studies;

COMMENT ON FUNCTION get_study_analytics(UUID) IS 'Admin and vendors can view study analytics';
COMMENT ON FUNCTION get_vendor_analytics(UUID) IS 'Admin only: view vendor analytics for studies';
