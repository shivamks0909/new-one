-- Migration 010: Enhanced Analytics with Genuine vs Fake Click Split
-- Extends get_study_analytics to include fake_click counts.

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
  counted_completes BIGINT,
  genuine_clicks BIGINT,
  fake_clicks BIGINT,
  fake_clicks_by_reason JSONB
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
    COUNT(DISTINCT CASE WHEN r.is_counted = true THEN r.id END)                AS counted_completes,
    -- Genuine = sessions that reached a terminal state (proven origin via /start)
    COUNT(DISTINCT CASE WHEN r.final_status IS NOT NULL AND r.final_status != 'IN_PROGRESS' THEN s.id END) AS genuine_clicks,
    -- Fake = rejected callbacks recorded in fake_click_events
    (SELECT COUNT(*) FROM fake_click_events fce WHERE fce.study_id = study_id_param) AS fake_clicks,
    -- Fake breakdown by rejection reason
    COALESCE(
      (SELECT jsonb_object_agg(fce.rejection_reason, cnt)
       FROM (SELECT rejection_reason, COUNT(*) AS cnt
             FROM fake_click_events
             WHERE study_id = study_id_param
             GROUP BY rejection_reason) fce),
      '{}'::jsonb
    ) AS fake_clicks_by_reason
  FROM sessions s
  LEFT JOIN responses r ON r.session_id = s.id
  WHERE s.study_id = study_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Standalone fake click analytics function
CREATE OR REPLACE FUNCTION get_fake_click_analytics(study_id_param UUID)
RETURNS TABLE (
  total_fake_clicks BIGINT,
  by_reason JSONB,
  recent_fake_clicks JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_fake_clicks,
    COALESCE(
      (SELECT jsonb_object_agg(rejection_reason, cnt)
       FROM (SELECT rejection_reason, COUNT(*) AS cnt
             FROM fake_click_events
             WHERE study_id = study_id_param
             GROUP BY rejection_reason) sub),
      '{}'::jsonb
    ) AS by_reason,
    COALESCE(
      (SELECT jsonb_agg(row_to_json(fc))
       FROM (SELECT uid, rejection_reason, ip_address, provider, created_at
             FROM fake_click_events
             WHERE study_id = study_id_param
             ORDER BY created_at DESC
             LIMIT 50) fc),
      '[]'::jsonb
    ) AS recent_fake_clicks
  FROM fake_click_events
  WHERE study_id = study_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
