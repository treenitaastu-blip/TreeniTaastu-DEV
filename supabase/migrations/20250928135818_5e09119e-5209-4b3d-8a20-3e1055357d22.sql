-- Fix the calculate_user_streaks function to avoid unsafe DELETE operations

CREATE OR REPLACE FUNCTION public.calculate_user_streaks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_rec RECORD;
  current_streak INTEGER;
  best_streak INTEGER;
  last_activity DATE;
BEGIN
  -- Calculate streaks for each user based on userprogress (Kontorikeha) and workout_sessions (PT)
  FOR user_rec IN 
    SELECT DISTINCT user_id FROM (
      SELECT user_id FROM userprogress 
      UNION 
      SELECT user_id FROM workout_sessions WHERE ended_at IS NOT NULL
    ) u
  LOOP
    -- Calculate streak from userprogress (static program) and workout sessions (PT)
    WITH user_days AS (
      SELECT DISTINCT completed_at::date as day
      FROM userprogress 
      WHERE user_id = user_rec.user_id AND completed_at IS NOT NULL
      UNION
      SELECT DISTINCT ended_at::date as day  
      FROM workout_sessions 
      WHERE user_id = user_rec.user_id AND ended_at IS NOT NULL
      ORDER BY day DESC
    ),
    ordered_days AS (
      SELECT day, 
             LAG(day) OVER (ORDER BY day) as prev_day,
             ROW_NUMBER() OVER (ORDER BY day DESC) as rn
      FROM user_days
    ),
    streak_groups AS (
      SELECT day,
             SUM(CASE WHEN prev_day IS NULL OR day - prev_day > 1 THEN 1 ELSE 0 END) 
             OVER (ORDER BY day DESC ROWS UNBOUNDED PRECEDING) as grp
      FROM ordered_days
    ),
    streaks AS (
      SELECT grp, 
             COUNT(*) as streak_length,
             MAX(day) as latest_day,
             MIN(day) as earliest_day
      FROM streak_groups
      GROUP BY grp
      ORDER BY latest_day DESC
    )
    SELECT 
      COALESCE(
        (SELECT streak_length 
         FROM streaks 
         WHERE latest_day >= CURRENT_DATE - interval '1 day' 
         ORDER BY latest_day DESC 
         LIMIT 1), 
        0
      ),
      COALESCE(MAX(streak_length), 0),
      COALESCE(
        (SELECT latest_day 
         FROM streaks 
         WHERE latest_day >= CURRENT_DATE - interval '7 days' 
         ORDER BY latest_day DESC 
         LIMIT 1),
        NULL
      )
    INTO current_streak, best_streak, last_activity
    FROM streaks;
    
    -- Insert or update calculated streak for this specific user only
    INSERT INTO user_streaks (user_id, current_streak, best_streak, last_workout_date, updated_at)
    VALUES (user_rec.user_id, current_streak, best_streak, last_activity, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      current_streak = EXCLUDED.current_streak,
      best_streak = EXCLUDED.best_streak,
      last_workout_date = EXCLUDED.last_workout_date,
      updated_at = NOW();
  END LOOP;
END;
$function$;

-- Also create an optimized version that only updates specific users' streaks
CREATE OR REPLACE FUNCTION public.update_user_streak(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_streak INTEGER;
  best_streak INTEGER;
  last_activity DATE;
BEGIN
  -- Calculate streak for the specific user only
  WITH user_days AS (
    SELECT DISTINCT completed_at::date as day
    FROM userprogress 
    WHERE user_id = target_user_id AND completed_at IS NOT NULL
    UNION
    SELECT DISTINCT ended_at::date as day  
    FROM workout_sessions 
    WHERE user_id = target_user_id AND ended_at IS NOT NULL
    ORDER BY day DESC
  ),
  ordered_days AS (
    SELECT day, 
           LAG(day) OVER (ORDER BY day) as prev_day,
           ROW_NUMBER() OVER (ORDER BY day DESC) as rn
    FROM user_days
  ),
  streak_groups AS (
    SELECT day,
           SUM(CASE WHEN prev_day IS NULL OR day - prev_day > 1 THEN 1 ELSE 0 END) 
           OVER (ORDER BY day DESC ROWS UNBOUNDED PRECEDING) as grp
    FROM ordered_days
  ),
  streaks AS (
    SELECT grp, 
           COUNT(*) as streak_length,
           MAX(day) as latest_day,
           MIN(day) as earliest_day
    FROM streak_groups
    GROUP BY grp
    ORDER BY latest_day DESC
  )
  SELECT 
    COALESCE(
      (SELECT streak_length 
       FROM streaks 
       WHERE latest_day >= CURRENT_DATE - interval '1 day' 
       ORDER BY latest_day DESC 
       LIMIT 1), 
      0
    ),
    COALESCE(MAX(streak_length), 0),
    COALESCE(
      (SELECT latest_day 
       FROM streaks 
       WHERE latest_day >= CURRENT_DATE - interval '7 days' 
       ORDER BY latest_day DESC 
       LIMIT 1),
      NULL
    )
  INTO current_streak, best_streak, last_activity
  FROM streaks;
  
  -- Insert or update calculated streak for this specific user
  INSERT INTO user_streaks (user_id, current_streak, best_streak, last_workout_date, updated_at)
  VALUES (target_user_id, current_streak, best_streak, last_activity, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    current_streak = EXCLUDED.current_streak,
    best_streak = EXCLUDED.best_streak,
    last_workout_date = EXCLUDED.last_workout_date,
    updated_at = NOW();
END;
$function$;