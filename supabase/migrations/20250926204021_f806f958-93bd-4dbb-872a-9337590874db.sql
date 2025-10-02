-- Fix v_static_status view to properly calculate current program day per user
DROP VIEW IF EXISTS v_static_status;

CREATE VIEW v_static_status AS
WITH user_start_info AS (
  SELECT 
    ss.user_id,
    ss.start_monday,
    -- Calculate days elapsed since start (excluding weekends)
    CASE 
      WHEN EXTRACT(dow FROM now() AT TIME ZONE 'Europe/Tallinn') IN (0, 6) THEN 
        -- If today is weekend, count to last Friday
        (SELECT COUNT(*) FROM generate_series(
          ss.start_monday::date, 
          (now() AT TIME ZONE 'Europe/Tallinn')::date - INTERVAL '1 day' * 
          CASE EXTRACT(dow FROM now() AT TIME ZONE 'Europe/Tallinn')
            WHEN 0 THEN 1  -- Sunday, go back to Friday
            WHEN 6 THEN 0  -- Saturday, go back to Friday
          END, 
          '1 day'
        ) AS d WHERE EXTRACT(dow FROM d) NOT IN (0, 6))
      ELSE
        -- Count workdays from start to today
        (SELECT COUNT(*) FROM generate_series(
          ss.start_monday::date, 
          (now() AT TIME ZONE 'Europe/Tallinn')::date, 
          '1 day'
        ) AS d WHERE EXTRACT(dow FROM d) NOT IN (0, 6))
    END AS workdays_since_start,
    -- Current day of week in Tallinn timezone
    EXTRACT(dow FROM now() AT TIME ZONE 'Europe/Tallinn')::int AS current_day_of_week
  FROM static_starts ss
),
user_progress AS (
  SELECT 
    up.user_id,
    COUNT(DISTINCT up.programday_id) as completed_count,
    ARRAY_AGG(DISTINCT pd.week ORDER BY pd.week) as completed_weeks,
    MAX(pd.week) as max_completed_week,
    MAX(CASE WHEN pd.week = (SELECT MAX(pd2.week) FROM programday pd2 JOIN userprogress up2 ON pd2.id = up2.programday_id WHERE up2.user_id = up.user_id) THEN pd.day ELSE 0 END) as max_completed_day_in_last_week
  FROM userprogress up
  JOIN programday pd ON up.programday_id = pd.id
  GROUP BY up.user_id
),
next_available_day AS (
  SELECT 
    usi.user_id,
    usi.start_monday,
    usi.workdays_since_start,
    usi.current_day_of_week,
    -- Calculate which program week and day should be available
    CASE 
      -- If weekend, allow last Friday's day or next Monday's day
      WHEN usi.current_day_of_week IN (0, 6) THEN 
        COALESCE(up.max_completed_week, 1)
      -- If workday, calculate based on workdays elapsed
      ELSE
        LEAST(((usi.workdays_since_start - 1) / 5) + 1, 4)
    END AS current_week,
    CASE 
      WHEN usi.current_day_of_week IN (0, 6) THEN 
        -- Weekend: allow completing the last available day
        GREATEST(COALESCE(up.max_completed_day_in_last_week, 1), 1)
      ELSE
        -- Workday: calculate current day
        LEAST(((usi.workdays_since_start - 1) % 5) + 1, 5)
    END AS current_day,
    up.completed_count
  FROM user_start_info usi
  LEFT JOIN user_progress up ON usi.user_id = up.user_id
)
SELECT 
  nad.user_id,
  true as is_started,
  'static' as program_type,
  nad.start_monday,
  nad.current_week,
  nad.current_day_of_week,
  -- Find the actual programday_id for current week/day
  (SELECT pd.id 
   FROM programday pd 
   WHERE pd.week = nad.current_week 
     AND pd.day = CASE 
       WHEN nad.current_day_of_week IN (0, 6) THEN 
         -- Weekend: find next uncompleted day or current day
         (SELECT COALESCE(
           (SELECT MIN(pd2.day) 
            FROM programday pd2 
            WHERE pd2.week = nad.current_week 
              AND NOT EXISTS (
                SELECT 1 FROM userprogress up 
                WHERE up.user_id = nad.user_id AND up.programday_id = pd2.id
              )
           ),
           nad.current_day
         ))
       ELSE nad.current_day
     END
   LIMIT 1) as current_programday_id
FROM next_available_day nad
WHERE nad.user_id IS NOT NULL;