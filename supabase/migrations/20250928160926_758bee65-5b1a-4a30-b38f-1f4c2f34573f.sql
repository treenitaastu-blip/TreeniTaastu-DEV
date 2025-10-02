-- Create user-friendly analytics summary function
DROP FUNCTION IF EXISTS public.get_analytics_summary();

CREATE OR REPLACE FUNCTION public.get_analytics_summary()
RETURNS TABLE(
  total_users bigint,
  active_users bigint,
  new_users_7d bigint,
  avg_sessions_per_user_7d numeric,
  completion_rate numeric,
  avg_rpe numeric,
  workouts_started_7d bigint,
  workouts_completed_7d bigint,
  dropoff_day numeric,
  retention_day_7 numeric,
  retention_day_30 numeric,
  total_volume_kg numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  total_vol numeric := 0;
  started_7d bigint := 0;
  completed_7d bigint := 0;
  avg_rpe_val numeric := 0;
BEGIN
  -- For non-authenticated users, return empty data
  IF current_user_id IS NULL THEN
    RETURN QUERY SELECT 
      0::bigint, 0::bigint, 0::bigint, 0::numeric, 0::numeric, 0::numeric,
      0::bigint, 0::bigint, 0::numeric, 0::numeric, 0::numeric, 0::numeric;
    RETURN;
  END IF;

  -- Calculate user-specific total volume from set logs (last 30 days)
  SELECT COALESCE(SUM(sl.weight_kg_done * sl.reps_done), 0)
  INTO total_vol
  FROM set_logs sl
  WHERE sl.user_id = current_user_id
    AND sl.weight_kg_done IS NOT NULL 
    AND sl.reps_done IS NOT NULL
    AND sl.marked_done_at >= NOW() - INTERVAL '30 days';

  -- Calculate user-specific workout stats (last 7 days)
  SELECT 
    COUNT(*) FILTER (WHERE ws.started_at >= NOW() - INTERVAL '7 days'),
    COUNT(*) FILTER (WHERE ws.ended_at IS NOT NULL AND ws.ended_at >= NOW() - INTERVAL '7 days')
  INTO started_7d, completed_7d
  FROM workout_sessions ws
  WHERE ws.user_id = current_user_id;

  -- Calculate user-specific average RPE (last 7 days)
  SELECT COALESCE(AVG(en.rpe), 0)
  INTO avg_rpe_val
  FROM exercise_notes en
  JOIN workout_sessions ws ON ws.id = en.session_id
  WHERE en.user_id = current_user_id 
    AND en.rpe IS NOT NULL
    AND ws.started_at >= NOW() - INTERVAL '7 days';

  -- Return user-specific analytics
  RETURN QUERY SELECT 
    1::bigint as total_users, -- User count (self)
    CASE WHEN started_7d > 0 THEN 1::bigint ELSE 0::bigint END as active_users, -- Active in last 7 days
    0::bigint as new_users_7d, -- Not applicable for single user
    started_7d::numeric as avg_sessions_per_user_7d, -- Sessions for this user
    CASE WHEN started_7d > 0 THEN (completed_7d::numeric / started_7d::numeric) ELSE 0::numeric END as completion_rate,
    avg_rpe_val,
    started_7d,
    completed_7d,
    0::numeric as dropoff_day, -- Not applicable for single user
    CASE WHEN started_7d > 0 THEN 1::numeric ELSE 0::numeric END as retention_day_7,
    0::numeric as retention_day_30, -- Simplified for now
    total_vol;
END;
$$;