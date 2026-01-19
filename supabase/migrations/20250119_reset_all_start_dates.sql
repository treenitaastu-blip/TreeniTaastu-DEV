-- Reset all static program start dates to current/next Monday
-- This ensures everyone starts fresh from the same point
-- For 50+ concurrent users, we ensure optimal performance

-- Calculate the target Monday (current Monday if weekday, next Monday if weekend)
DO $$
DECLARE
  v_today date;
  v_target_monday date;
BEGIN
  v_today := CURRENT_DATE;
  
  -- Calculate target Monday
  IF EXTRACT(DOW FROM v_today) = 0 THEN
    -- Sunday (0), next Monday is tomorrow
    v_target_monday := v_today + 1;
  ELSIF EXTRACT(DOW FROM v_today) = 6 THEN
    -- Saturday (6), next Monday is day after tomorrow
    v_target_monday := v_today + 2;
  ELSE
    -- Monday-Friday, calculate this week's Monday
    -- DOW: Monday=1, Tuesday=2, ..., Friday=5
    -- Subtract (DOW - 1) days to get to Monday
    v_target_monday := v_today - (EXTRACT(DOW FROM v_today)::integer - 1);
  END IF;
  
  -- Reset all start dates to the target Monday
  UPDATE static_starts
  SET 
    start_monday = v_target_monday,
    updated_at = NOW()
  WHERE start_monday != v_target_monday;
  
  -- For users who don't have a start date yet, create one
  INSERT INTO static_starts (user_id, start_monday, created_at)
  SELECT 
    p.id,
    v_target_monday,
    NOW()
  FROM profiles p
  LEFT JOIN static_starts ss ON ss.user_id = p.id
  WHERE ss.user_id IS NULL
    AND p.id IS NOT NULL;
  
  -- Log the reset (optional - can be removed)
  RAISE NOTICE 'Reset all static program start dates to: %', v_target_monday;
END $$;

-- Ensure optimal indexes for performance with 50+ concurrent users
-- These indexes are critical for fast queries in useProgramCalendarState

-- Index for userprogress queries (user_id + programday_id + done filter)
CREATE INDEX IF NOT EXISTS idx_userprogress_user_programday_done 
ON public.userprogress(user_id, programday_id, done) 
WHERE done = true;

-- Index for userprogress queries ordered by completed_at
CREATE INDEX IF NOT EXISTS idx_userprogress_user_completed 
ON public.userprogress(user_id, completed_at ASC) 
WHERE done = true;

-- Ensure existing indexes are present
CREATE INDEX IF NOT EXISTS idx_static_starts_user_id ON public.static_starts(user_id);
CREATE INDEX IF NOT EXISTS idx_static_starts_start_monday ON public.static_starts(start_monday);

-- Composite index for the common query pattern in useProgramCalendarState
-- Query: SELECT start_monday FROM static_starts WHERE user_id = ? LIMIT 1
-- The existing idx_static_starts_user_id should handle this, but let's ensure uniqueness if needed
CREATE UNIQUE INDEX IF NOT EXISTS idx_static_starts_user_unique ON public.static_starts(user_id);

-- Index for programday lookups (week, day)
CREATE INDEX IF NOT EXISTS idx_programday_week_day ON public.programday(week, day);

-- Update statistics for query planner
ANALYZE public.static_starts;
ANALYZE public.userprogress;
ANALYZE public.programday;
