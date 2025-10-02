-- Drop and recreate get_analytics_summary function to fix analytics
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
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Use the existing admin_analytics function which has the same data
  RETURN QUERY 
  SELECT 
    aa.totalusers as total_users,
    aa.activeusers7d as active_users,
    aa.newusers7d as new_users_7d,
    aa.avgsessionsperuser7d as avg_sessions_per_user_7d,
    aa.completionrate30d as completion_rate,
    aa.avgrpe7d as avg_rpe,
    aa.workoutsstarted7d as workouts_started_7d,
    aa.workoutscompleted7d as workouts_completed_7d,
    aa.dropoffdaymean as dropoff_day,
    aa.retentionday7 as retention_day_7,
    aa.retentionday30 as retention_day_30
  FROM public.admin_analytics() aa;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_analytics_summary() TO authenticated;