-- Create a simplified analytics function that works for all users
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
  retention_day_30 numeric
)
LANGUAGE plpgsql
STABLE
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
  _avg_sessions_per_user_7d numeric;
  _completion_rate_30d numeric;
  _avg_rpe_7d numeric;
  _workouts_started_7d bigint;
  _workouts_completed_7d bigint;
  _dropoff_day_mean numeric;
  _retention7 numeric;
  _retention30 numeric;
BEGIN
  -- Total users
  SELECT count(*) INTO _total_users FROM public.profiles;

  -- Active users in last 7 days
  SELECT count(DISTINCT ws.user_id) INTO _active_users7d
  FROM public.workout_sessions ws
  WHERE ws.started_at >= since7;

  -- New users in last 7 days
  SELECT count(*) INTO _new_users7d
  FROM public.profiles p
  WHERE p.created_at >= since7;

  -- Session counts
  SELECT count(*) INTO _workouts_started_7d
  FROM public.workout_sessions ws
  WHERE ws.started_at >= since7;

  SELECT count(*) INTO _workouts_completed_7d
  FROM public.workout_sessions ws
  WHERE ws.ended_at is not null and ws.ended_at >= since7;

  SELECT count(*) INTO _sessions7d
  FROM public.workout_sessions ws
  WHERE ws.started_at >= since7;

  SELECT
    count(*) filter (where ws.started_at >= since30)               as started30,
    count(*) filter (where ws.ended_at is not null and ws.ended_at >= since30) as completed30
  INTO _sessions30_started, _sessions30_completed
  FROM public.workout_sessions ws;

  -- Rates
  _avg_sessions_per_user_7d := case when _active_users7d > 0
    then (_sessions7d::numeric / _active_users7d::numeric)
    else 0 end;

  _completion_rate_30d := case when _sessions30_started > 0
    then (_sessions30_completed::numeric / _sessions30_started::numeric)
    else 0 end;

  -- Avg RPE (use session summary or exercise notes)
  SELECT avg(en.rpe)::numeric INTO _avg_rpe_7d
  FROM exercise_notes en
  JOIN workout_sessions ws ON ws.id = en.session_id
  WHERE ws.started_at >= since7 
    AND en.rpe is not null 
    AND en.rpe > 0;

  -- Dropoff: placeholder value  
  _dropoff_day_mean := 3.5;

  -- Retention approximations:
  _retention7 := case when _total_users > 0
    then (_active_users7d::numeric / _total_users::numeric)
    else 0 end;

  -- users active in last 30 days
  SELECT count(distinct ws.user_id) INTO _sessions30_started
  FROM public.workout_sessions ws
  WHERE ws.started_at >= since30;

  _retention30 := case when _total_users > 0
    then (_sessions30_started::numeric / _total_users::numeric)
    else 0 end;

  RETURN QUERY
    SELECT
      _total_users,
      _active_users7d,
      _new_users7d,
      coalesce(_avg_sessions_per_user_7d, 0),
      coalesce(_completion_rate_30d, 0),
      coalesce(_avg_rpe_7d, 0),
      _workouts_started_7d,
      _workouts_completed_7d,
      _dropoff_day_mean,
      coalesce(_retention7, 0),
      coalesce(_retention30, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_analytics_summary() TO authenticated;