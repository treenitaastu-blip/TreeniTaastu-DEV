-- Fix v_static_status view and related issues (corrected)

-- 1. Create the missing v_static_status view
DROP VIEW IF EXISTS public.v_static_status;

CREATE VIEW public.v_static_status AS
SELECT 
  p.id as user_id,
  ss.start_monday IS NOT NULL as is_started,
  ss.start_monday::text as start_monday,
  -- Calculate allowed programday_id based on start date and current date
  CASE 
    WHEN ss.start_monday IS NULL THEN NULL
    ELSE (
      SELECT pd.id 
      FROM programday pd
      WHERE pd.week = LEAST(
        CEIL((EXTRACT(EPOCH FROM (CURRENT_DATE::timestamp - ss.start_monday::timestamp)) / 86400 + 1) / 7.0)::int,
        4
      )
      AND pd.day = LEAST(
        CASE EXTRACT(DOW FROM CURRENT_DATE::timestamp)
          WHEN 0 THEN 5  -- Sunday -> Friday (last workday)
          WHEN 6 THEN 5  -- Saturday -> Friday (last workday)
          ELSE EXTRACT(DOW FROM CURRENT_DATE::timestamp)::int  -- Monday=1, Friday=5
        END,
        5
      )
      ORDER BY pd.week, pd.day
      LIMIT 1
    )
  END as allowed_programday_id
FROM profiles p
LEFT JOIN static_starts ss ON ss.user_id = p.id;

-- Grant permissions
GRANT SELECT ON public.v_static_status TO authenticated;