-- Fix get_analytics_summary to return system-wide analytics for admin dashboard
-- The previous migration (20250928161058) incorrectly changed this to user-specific analytics
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
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  now_ts      timestamptz := now();
  since7      timestamptz := now() - interval '7 days';
  since30     timestamptz := now() - interval '30 days';
  _total_users bigint;
  _active_users7d bigint;
  _new_users7d bigint;
  _sessions7d bigint;
  _sessions30_started bigint;
  _sessions30_completed bigint;
  _active_users30d bigint; -- Fixed: separate variable for 30-day active users
  _avg_sessions_per_user_7d numeric;
  _completion_rate_30d numeric;
  _avg_rpe_7d numeric;
  _workouts_started_7d bigint;
  _workouts_completed_7d bigint;
  _dropoff_day_mean numeric;
  _retention7 numeric;
  _retention30 numeric;
  _total_volume_kg numeric;
BEGIN
  -- Total users (system-wide)
  SELECT count(*) INTO _total_users FROM public.profiles;

  -- Active users in last 7 days (system-wide)
  SELECT count(DISTINCT ws.user_id) INTO _active_users7d
  FROM public.workout_sessions ws
  WHERE ws.started_at >= since7;

  -- New users in last 7 days (system-wide)
  SELECT count(*) INTO _new_users7d
  FROM public.profiles p
  WHERE p.created_at >= since7;

  -- Workout sessions started in last 7 days (system-wide)
  SELECT count(*) INTO _workouts_started_7d
  FROM public.workout_sessions ws
  WHERE ws.started_at >= since7;

  -- Workout sessions completed in last 7 days (system-wide)
  SELECT count(*) INTO _workouts_completed_7d
  FROM public.workout_sessions ws
  WHERE ws.ended_at IS NOT NULL AND ws.ended_at >= since7;

  -- Total sessions in last 7 days (for avg calculation)
  SELECT count(*) INTO _sessions7d
  FROM public.workout_sessions ws
  WHERE ws.started_at >= since7;

  -- Sessions in last 30 days (for completion rate)
  SELECT
    count(*) FILTER (WHERE ws.started_at >= since30) as started30,
    count(*) FILTER (WHERE ws.ended_at IS NOT NULL AND ws.ended_at >= since30) as completed30
  INTO _sessions30_started, _sessions30_completed
  FROM public.workout_sessions ws;

  -- Active users in last 30 days (for retention calculation)
  SELECT count(DISTINCT ws.user_id) INTO _active_users30d
  FROM public.workout_sessions ws
  WHERE ws.started_at >= since30;

  -- Calculate average sessions per user (7 days)
  _avg_sessions_per_user_7d := CASE 
    WHEN _active_users7d > 0 
    THEN (_sessions7d::numeric / _active_users7d::numeric)
    ELSE 0 
  END;

  -- Calculate completion rate (30 days)
  _completion_rate_30d := CASE 
    WHEN _sessions30_started > 0 
    THEN (_sessions30_completed::numeric / _sessions30_started::numeric)
    ELSE 0 
  END;

  -- Average RPE in last 7 days (system-wide)
  SELECT COALESCE(AVG(en.rpe)::numeric, 0) INTO _avg_rpe_7d
  FROM exercise_notes en
  JOIN workout_sessions ws ON ws.id = en.session_id
  WHERE ws.started_at >= since7 
    AND en.rpe IS NOT NULL 
    AND en.rpe > 0;

  -- Calculate dropoff day from actual user progress data
  -- This calculates the average day number where users stop progressing
  WITH user_last_day AS (
    SELECT 
      up.user_id,
      MAX(pd.day + (pd.week - 1) * 5) as last_day_number
    FROM userprogress up
    JOIN programday pd ON pd.id = up.programday_id
    WHERE up.done = true
    GROUP BY up.user_id
  )
  SELECT COALESCE(AVG(last_day_number)::numeric, 0) INTO _dropoff_day_mean
  FROM user_last_day;

  -- If no dropoff data, use a reasonable default
  IF _dropoff_day_mean = 0 OR _dropoff_day_mean IS NULL THEN
    _dropoff_day_mean := 3.5;
  END IF;

  -- Calculate retention rates
  _retention7 := CASE 
    WHEN _total_users > 0 
    THEN (_active_users7d::numeric / _total_users::numeric)
    ELSE 0 
  END;

  _retention30 := CASE 
    WHEN _total_users > 0 
    THEN (_active_users30d::numeric / _total_users::numeric)
    ELSE 0 
  END;

  -- Calculate total volume lifted in last 30 days (system-wide)
  SELECT COALESCE(SUM(sl.weight_kg_done * sl.reps_done), 0) INTO _total_volume_kg
  FROM set_logs sl
  WHERE sl.weight_kg_done IS NOT NULL 
    AND sl.reps_done IS NOT NULL
    AND sl.marked_done_at >= since30;

  -- Return system-wide analytics
  RETURN QUERY
    SELECT
      _total_users,
      _active_users7d,
      _new_users7d,
      COALESCE(_avg_sessions_per_user_7d, 0),
      COALESCE(_completion_rate_30d, 0),
      COALESCE(_avg_rpe_7d, 0),
      _workouts_started_7d,
      _workouts_completed_7d,
      COALESCE(_dropoff_day_mean, 0),
      COALESCE(_retention7, 0),
      COALESCE(_retention30, 0),
      COALESCE(_total_volume_kg, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_analytics_summary() TO authenticated;

