-- Weekly analytics enhancements: timezone-aware weekly view and helpful indexes

-- View: v_user_weekly_extended
DROP VIEW IF EXISTS v_user_weekly_extended;
CREATE VIEW v_user_weekly_extended AS
WITH sessions AS (
  SELECT 
    v.user_id,
    (date_trunc('week', v.started_at AT TIME ZONE 'Europe/Tallinn'))::date AS week_start,
    v.avg_rpe,
    v.total_volume_kg,
    v.started_at,
    v.ended_at
  FROM v_session_summary v
)
SELECT 
  user_id,
  week_start,
  COUNT(*) FILTER (WHERE ended_at IS NOT NULL) AS sessions_count,
  COALESCE(SUM(total_volume_kg), 0)::numeric AS weekly_volume_kg,
  COALESCE(AVG(avg_rpe), 0)::numeric AS weekly_avg_rpe,
  MAX(ended_at) AS last_session_date
FROM sessions
GROUP BY user_id, week_start
ORDER BY user_id, week_start DESC;

-- Indexes to support weekly queries
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_started_at
  ON workout_sessions (user_id, started_at);


