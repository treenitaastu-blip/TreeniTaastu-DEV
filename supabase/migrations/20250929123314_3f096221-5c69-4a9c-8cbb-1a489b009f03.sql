-- Fix static training program system to be repeatable after 20 days
-- Remove status column dependency and create proper cycling logic

-- Drop existing view that has incorrect status logic  
DROP VIEW IF EXISTS v_static_status;

-- Create improved view with cycling logic for 20-day program
CREATE OR REPLACE VIEW v_static_status AS
SELECT 
  ss.user_id,
  ss.start_monday,
  CASE 
    WHEN ss.start_monday > CURRENT_DATE THEN 'pending'
    ELSE 'active'
  END AS status,
  (CURRENT_DATE - ss.start_monday) AS days_since_start,
  -- Calculate current cycle (0-based) and day within cycle (1-20)
  FLOOR((CURRENT_DATE - ss.start_monday) / 20) AS current_cycle,
  CASE 
    WHEN (CURRENT_DATE - ss.start_monday) % 20 = 0 AND (CURRENT_DATE - ss.start_monday) > 0 
    THEN 20  -- Day 20 of cycle
    ELSE GREATEST(1, ((CURRENT_DATE - ss.start_monday) % 20) + 1)  -- Days 1-19 of cycle
  END AS current_day_in_cycle,
  -- Calculate which week and day in the 4-week structure
  CASE 
    WHEN (CURRENT_DATE - ss.start_monday) % 20 = 0 AND (CURRENT_DATE - ss.start_monday) > 0 
    THEN 4  -- Week 4
    ELSE GREATEST(1, CEIL(((CURRENT_DATE - ss.start_monday) % 20 + 1) / 5.0))
  END AS current_week_in_cycle,
  CASE 
    WHEN (CURRENT_DATE - ss.start_monday) % 20 = 0 AND (CURRENT_DATE - ss.start_monday) > 0 
    THEN 5  -- Day 5 of week 4  
    ELSE GREATEST(1, (((CURRENT_DATE - ss.start_monday) % 20) % 5) + 1)
  END AS current_weekday_in_cycle
FROM static_starts ss;

-- Create function to get current program day for user (cycling through 20 days)
CREATE OR REPLACE FUNCTION get_user_current_program_day(p_user_id uuid)
RETURNS TABLE(
  programday_id uuid,
  week integer,
  day integer,
  cycle_number integer,
  day_in_cycle integer,
  can_complete boolean
) 
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_status RECORD;
  v_program_day RECORD;
BEGIN
  -- Get user status from static_starts
  SELECT * INTO v_status 
  FROM v_static_status 
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    -- No program started yet
    RETURN;
  END IF;
  
  -- Get the program day for current position in cycle
  SELECT * INTO v_program_day
  FROM programday 
  WHERE week = v_status.current_week_in_cycle 
    AND day = v_status.current_weekday_in_cycle
  LIMIT 1;
  
  IF FOUND THEN
    RETURN QUERY SELECT 
      v_program_day.id,
      v_program_day.week,
      v_program_day.day,
      v_status.current_cycle::integer,
      v_status.current_day_in_cycle::integer,
      TRUE; -- Always can complete in static system
  END IF;
END;
$$;

-- Create function to mark program day complete (allowing multiple completions)
CREATE OR REPLACE FUNCTION complete_static_program_day(p_user_id uuid, p_programday_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_today RECORD;
  v_today date := CURRENT_DATE;
BEGIN
  -- Check if already completed today (prevent double completion same day)
  SELECT * INTO v_existing_today
  FROM userprogress 
  WHERE user_id = p_user_id 
    AND programday_id = p_programday_id 
    AND completed_at::date = v_today;
    
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Already completed today',
      'completed_at', v_existing_today.completed_at
    );
  END IF;
  
  -- Mark as complete
  INSERT INTO userprogress (user_id, programday_id, completed_at, done)
  VALUES (p_user_id, p_programday_id, NOW(), true);
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Program day completed',
    'completed_at', NOW()
  );
END;
$$;