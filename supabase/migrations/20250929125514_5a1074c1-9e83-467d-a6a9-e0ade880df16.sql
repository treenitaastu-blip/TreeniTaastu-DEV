-- Fix ambiguous column reference in get_user_current_program_day function

DROP FUNCTION IF EXISTS get_user_current_program_day(uuid);

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
SECURITY DEFINER
SET search_path = public
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
  -- Use qualified column names to avoid ambiguity
  SELECT * INTO v_program_day
  FROM programday 
  WHERE programday.week = v_status.current_week_in_cycle 
    AND programday.day = v_status.current_weekday_in_cycle
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