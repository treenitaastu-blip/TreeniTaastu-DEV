-- Fix security issues from previous migration by adding proper search_path settings

-- Update functions with proper search_path for security
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
SECURITY DEFINER SET search_path = public
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

-- Update complete function with proper security
CREATE OR REPLACE FUNCTION complete_static_program_day(p_user_id uuid, p_programday_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_existing_today RECORD;
  v_today date := CURRENT_DATE;
BEGIN
  -- Security check - users can only complete their own program days
  IF p_user_id != auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: can only complete own program days';
  END IF;
  
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