-- Fix start_static_program function to set start_monday correctly for new users
-- For new clients: set start_monday to current Monday (if weekday) or next Monday (if weekend)
-- This ensures the unlock logic works correctly: Day 1 unlocks Monday 07:00, Day 2 Tuesday 07:00, etc.

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
  
  -- Get today's date in Estonia timezone (assuming server timezone is UTC, adjust if needed)
  -- We'll use CURRENT_DATE which should be the server's current date
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
