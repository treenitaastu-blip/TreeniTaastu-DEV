-- Optimized client analytics RPC function
-- Replaces multiple queries with a single optimized database query
DROP FUNCTION IF EXISTS public.get_client_analytics(p_user_id uuid);

CREATE OR REPLACE FUNCTION public.get_client_analytics(p_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  email text,
  total_sessions bigint,
  completed_sessions bigint,
  completion_rate numeric,
  total_volume_kg numeric,
  total_reps bigint,
  total_sets bigint,
  avg_rpe numeric,
  current_streak integer,
  best_streak integer,
  last_workout_date timestamptz,
  first_workout_date timestamptz,
  active_programs bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text;
  v_total_sessions bigint;
  v_completed_sessions bigint;
  v_completion_rate numeric;
  v_total_volume_kg numeric;
  v_total_reps bigint;
  v_total_sets bigint;
  v_avg_rpe numeric;
  v_current_streak integer := 0;
  v_best_streak integer := 0;
  v_last_workout_date timestamptz;
  v_first_workout_date timestamptz;
  v_active_programs bigint;
BEGIN
  -- Get user email
  SELECT email INTO v_email
  FROM profiles
  WHERE id = p_user_id;
  
  -- Get session stats (aggregated in database)
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE ended_at IS NOT NULL) as completed,
    MIN(started_at) as first_date,
    MAX(started_at) FILTER (WHERE ended_at IS NOT NULL) as last_date
  INTO v_total_sessions, v_completed_sessions, v_first_workout_date, v_last_workout_date
  FROM workout_sessions
  WHERE user_id = p_user_id;
  
  -- Calculate completion rate
  v_completion_rate := CASE 
    WHEN v_total_sessions > 0 
    THEN (v_completed_sessions::numeric / v_total_sessions::numeric)
    ELSE 0 
  END;
  
  -- Get volume, reps, and sets stats (aggregated in database)
  SELECT 
    COALESCE(SUM(sl.weight_kg_done * sl.reps_done), 0) as volume,
    COALESCE(SUM(sl.reps_done), 0) as reps,
    COUNT(*) as sets
  INTO v_total_volume_kg, v_total_reps, v_total_sets
  FROM set_logs sl
  JOIN workout_sessions ws ON ws.id = sl.session_id
  WHERE ws.user_id = p_user_id
    AND sl.weight_kg_done IS NOT NULL
    AND sl.reps_done IS NOT NULL;
  
  -- Get average RPE from exercise_notes (correct table)
  SELECT COALESCE(AVG(en.rpe), 0)
  INTO v_avg_rpe
  FROM exercise_notes en
  JOIN workout_sessions ws ON ws.id = en.session_id
  WHERE ws.user_id = p_user_id
    AND en.rpe IS NOT NULL
    AND en.rpe > 0;
  
  -- Get active programs count
  SELECT COUNT(*)
  INTO v_active_programs
  FROM client_programs
  WHERE assigned_to = p_user_id
    AND is_active = true;
  
  -- Calculate streaks (simplified - can be enhanced with dedicated streak table)
  WITH workout_dates AS (
    SELECT DISTINCT DATE(started_at) as workout_date
    FROM workout_sessions
    WHERE user_id = p_user_id
      AND ended_at IS NOT NULL
    ORDER BY workout_date DESC
  ),
  streak_groups AS (
    SELECT 
      workout_date,
      workout_date - ROW_NUMBER() OVER (ORDER BY workout_date)::integer as streak_group
    FROM workout_dates
  ),
  streaks AS (
    SELECT 
      streak_group,
      COUNT(*) as streak_length,
      MAX(workout_date) as streak_end
    FROM streak_groups
    GROUP BY streak_group
  )
  SELECT 
    COALESCE(MAX(CASE WHEN streak_end = (SELECT MAX(workout_date) FROM workout_dates) THEN streak_length END), 0),
    COALESCE(MAX(streak_length), 0)
  INTO v_current_streak, v_best_streak
  FROM streaks;
  
  -- Return results
  RETURN QUERY
    SELECT 
      p_user_id,
      v_email,
      COALESCE(v_total_sessions, 0),
      COALESCE(v_completed_sessions, 0),
      COALESCE(v_completion_rate, 0),
      COALESCE(v_total_volume_kg, 0),
      COALESCE(v_total_reps, 0),
      COALESCE(v_total_sets, 0),
      COALESCE(v_avg_rpe, 0),
      COALESCE(v_current_streak, 0),
      COALESCE(v_best_streak, 0),
      v_last_workout_date,
      v_first_workout_date,
      COALESCE(v_active_programs, 0);
END;
$$;

-- Create function for weekly analytics
DROP FUNCTION IF EXISTS public.get_client_weekly_analytics(p_user_id uuid, p_weeks integer);

CREATE OR REPLACE FUNCTION public.get_client_weekly_analytics(p_user_id uuid, p_weeks integer DEFAULT 12)
RETURNS TABLE(
  week_start date,
  sessions bigint,
  volume_kg numeric,
  avg_rpe numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
    WITH week_starts AS (
      SELECT 
        DATE_TRUNC('week', generate_series(
          DATE_TRUNC('week', NOW() - (p_weeks - 1) * INTERVAL '1 week'),
          DATE_TRUNC('week', NOW()),
          INTERVAL '1 week'
        ))::date as week_start
    ),
    session_weeks AS (
      SELECT 
        DATE_TRUNC('week', ws.started_at)::date as week_start,
        COUNT(*) FILTER (WHERE ws.ended_at IS NOT NULL) as sessions,
        COALESCE(SUM(sl.weight_kg_done * sl.reps_done), 0) as volume,
        AVG(en.rpe) FILTER (WHERE en.rpe IS NOT NULL AND en.rpe > 0) as avg_rpe
      FROM workout_sessions ws
      LEFT JOIN set_logs sl ON sl.session_id = ws.id 
        AND sl.weight_kg_done IS NOT NULL 
        AND sl.reps_done IS NOT NULL
      LEFT JOIN exercise_notes en ON en.session_id = ws.id 
        AND en.rpe IS NOT NULL 
        AND en.rpe > 0
      WHERE ws.user_id = p_user_id
        AND ws.started_at >= NOW() - (p_weeks * INTERVAL '1 week')
      GROUP BY DATE_TRUNC('week', ws.started_at)::date
    )
    SELECT 
      ws.week_start,
      COALESCE(sw.sessions, 0)::bigint,
      COALESCE(sw.volume, 0),
      COALESCE(sw.avg_rpe, 0)
    FROM week_starts ws
    LEFT JOIN session_weeks sw ON sw.week_start = ws.week_start
    ORDER BY ws.week_start DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_analytics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_weekly_analytics(uuid, integer) TO authenticated;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_set_logs_session_user_volume 
ON set_logs(session_id, weight_kg_done, reps_done) 
WHERE weight_kg_done IS NOT NULL AND reps_done IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exercise_notes_session_rpe 
ON exercise_notes(session_id, rpe) 
WHERE rpe IS NOT NULL AND rpe > 0;

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_dates 
ON workout_sessions(user_id, started_at DESC, ended_at) 
WHERE ended_at IS NOT NULL;

