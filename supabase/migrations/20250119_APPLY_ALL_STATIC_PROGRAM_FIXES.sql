-- ============================================================================
-- COMPLETE STATIC PROGRAM FIX - Apply All Fixes in One Go
-- This combines both migrations for easy application via Supabase Dashboard
-- ============================================================================
-- 
-- WHAT THIS DOES:
-- 1. Fixes start_static_program function to set correct Monday for new users
-- 2. Resets all existing start dates to current/next Monday
-- 3. Adds performance indexes for 50+ concurrent users
--
-- HOW TO APPLY:
-- 1. Go to Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project: dtxbrnrpzepwoxooqwlj
-- 3. Go to SQL Editor
-- 4. Copy and paste this entire file
-- 5. Click "Run" or press Cmd/Ctrl+Enter
-- ============================================================================

-- PART 1: Fix start_static_program function
-- This ensures new users get the correct start date (current Monday if weekday, next Monday if weekend)
CREATE OR REPLACE FUNCTION start_static_program(p_force boolean DEFAULT false)
RETURNS date
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_today date;
  v_current_monday date;
  v_start_monday date;
  v_existing_start date;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Get today's date
  v_today := CURRENT_DATE;
  
  -- Calculate current Monday (or next Monday if it's weekend)
  -- If today is Monday-Friday: use this week's Monday
  -- If today is Saturday-Sunday: use next Monday
  IF EXTRACT(DOW FROM v_today) = 0 THEN
    -- Sunday (0), next Monday is tomorrow
    v_current_monday := v_today + 1;
  ELSIF EXTRACT(DOW FROM v_today) = 6 THEN
    -- Saturday (6), next Monday is day after tomorrow
    v_current_monday := v_today + 2;
  ELSE
    -- Monday-Friday, calculate this week's Monday
    -- DOW: Monday=1, Tuesday=2, ..., Friday=5
    -- Subtract (DOW - 1) days to get to Monday
    v_current_monday := v_today - (EXTRACT(DOW FROM v_today)::integer - 1);
  END IF;
  
  -- Check if user already has a start date
  SELECT start_monday INTO v_existing_start
  FROM static_starts
  WHERE user_id = v_user_id;
  
  IF v_existing_start IS NOT NULL AND NOT p_force THEN
    -- User already has a start date and we're not forcing a reset
    RETURN v_existing_start;
  END IF;
  
  -- Set start_monday to the calculated Monday
  v_start_monday := v_current_monday;
  
  -- Insert or update the start date
  INSERT INTO static_starts (user_id, start_monday, created_at)
  VALUES (v_user_id, v_start_monday, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    start_monday = v_start_monday,
    updated_at = NOW();
  
  RETURN v_start_monday;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION start_static_program(boolean) TO authenticated;

-- PART 2: Reset all start dates to current/next Monday
-- This ensures everyone starts fresh from the same point
DO $$
DECLARE
  v_today date;
  v_target_monday date;
  v_updated_count integer;
  v_inserted_count integer;
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
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
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
  
  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  
  -- Log the results
  RAISE NOTICE 'Reset complete: Target Monday = %, Updated = % rows, Inserted = % rows', 
    v_target_monday, v_updated_count, v_inserted_count;
END $$;

-- PART 3: Add performance indexes for 50+ concurrent users
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

-- Index for programday lookups (week, day)
CREATE INDEX IF NOT EXISTS idx_programday_week_day ON public.programday(week, day);

-- Update statistics for query planner (helps with 50+ concurrent users)
ANALYZE public.static_starts;
ANALYZE public.userprogress;
ANALYZE public.programday;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this migration, you can verify it worked by running:
--
-- SELECT 
--   COUNT(*) as total_users,
--   COUNT(CASE WHEN start_monday = (SELECT start_monday FROM static_starts LIMIT 1) THEN 1 END) as users_on_target_monday,
--   MIN(start_monday) as earliest_start,
--   MAX(start_monday) as latest_start
-- FROM static_starts;
--
-- All users should have the same start_monday (the target Monday).
-- ============================================================================
