-- Drop and recreate analytics function with correct return type

-- 1. Drop existing function
DROP FUNCTION IF EXISTS public.get_analytics_summary();

-- 2. Create new version with complete analytics data
CREATE OR REPLACE FUNCTION public.get_analytics_summary()
RETURNS TABLE(
  total_sessions bigint,
  active_users bigint, 
  completion_rate numeric,
  avg_rpe numeric,
  dropoff_day numeric,
  total_volume numeric,
  weekly_streaks bigint,
  total_users bigint,
  new_users_7d bigint,
  workouts_started_7d bigint,
  workouts_completed_7d bigint,
  avg_sessions_per_user_7d numeric,
  retention_day_7 numeric,
  retention_day_30 numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  with recent_sessions as (
    select user_id, started_at::date as d
    from workout_sessions
    where started_at >= now() - interval '7 days'
  ),
  sessions_30 as (
    select id, started_at::date as d, ended_at, user_id
    from workout_sessions
    where started_at >= now() - interval '30 days'
  ),
  sessions_7d as (
    select id, user_id, ended_at
    from workout_sessions
    where started_at >= now() - interval '7 days'
  )
  select
    (select count(*) from workout_sessions) as total_sessions,
    (select count(distinct user_id) from recent_sessions) as active_users,
    (
      select coalesce(count(*) filter (where ended_at is not null)::numeric
             / nullif(count(*),0), 0)
      from sessions_30
    ) as completion_rate,
    (select avg(avg_rpe) from v_session_summary where avg_rpe is not null) as avg_rpe,
    (
      select avg(day)
      from (
        select user_id,
               count(*) filter (where ended_at is not null) as days_done,
               least(count(*),14) as day
        from v_session_summary
        group by user_id
      ) t
    ) as dropoff_day,
    (select sum(total_volume_kg) from v_session_summary) as total_volume,
    (
      select count(*) from user_streaks us
      where coalesce(us.current_streak,0) >= 7
    ) as weekly_streaks,
    (select count(*) from profiles) as total_users,
    (select count(*) from profiles where created_at >= now() - interval '7 days') as new_users_7d,
    (select count(*) from sessions_7d) as workouts_started_7d,
    (select count(*) from sessions_7d where ended_at is not null) as workouts_completed_7d,
    (
      select case 
        when count(distinct user_id) > 0 
        then count(*)::numeric / count(distinct user_id) 
        else 0 
      end
      from sessions_7d
    ) as avg_sessions_per_user_7d,
    (
      select case 
        when (select count(*) from profiles) > 0 
        then (select count(distinct user_id) from recent_sessions)::numeric / (select count(*) from profiles)
        else 0 
      end
    ) as retention_day_7,
    (
      select case 
        when (select count(*) from profiles) > 0 
        then (select count(distinct user_id) from sessions_30)::numeric / (select count(*) from profiles)
        else 0 
      end
    ) as retention_day_30
$function$;