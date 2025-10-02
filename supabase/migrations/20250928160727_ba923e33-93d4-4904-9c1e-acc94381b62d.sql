-- Drop and recreate get_analytics_summary function with total volume
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
  result_row record;
  total_vol numeric := 0;
BEGIN
  -- Call existing admin_analytics function
  SELECT * INTO result_row FROM admin_analytics() LIMIT 1;
  
  -- Calculate total volume from set logs (last 30 days)
  SELECT COALESCE(SUM(sl.weight_kg_done * sl.reps_done), 0)
  INTO total_vol
  FROM set_logs sl
  WHERE sl.weight_kg_done IS NOT NULL 
    AND sl.reps_done IS NOT NULL
    AND sl.marked_done_at >= NOW() - INTERVAL '30 days';
  
  RETURN QUERY SELECT 
    result_row.totalusers,
    result_row.activeusers7d,
    result_row.newusers7d,
    result_row.avgsessionsperuser7d,
    result_row.completionrate30d,
    result_row.avgrpe7d,
    result_row.workoutsstarted7d,
    result_row.workoutscompleted7d,
    result_row.dropoffdaymean,
    result_row.retentionday7,
    result_row.retentionday30,
    total_vol;
END;
$$;