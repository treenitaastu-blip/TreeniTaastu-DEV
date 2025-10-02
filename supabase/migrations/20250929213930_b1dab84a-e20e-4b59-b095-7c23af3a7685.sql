-- Fix complete_static_program_day to correctly calculate total reps and seconds
-- by multiplying sets × reps/seconds for each exercise

CREATE OR REPLACE FUNCTION public.complete_static_program_day(p_user_id uuid, p_programday_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_today RECORD;
  v_today date := CURRENT_DATE;
  v_programday_data RECORD;
  v_total_sets INTEGER := 0;
  v_total_reps INTEGER := 0;
  v_total_seconds INTEGER := 0;
BEGIN
  -- Security check - users can only complete their own program days
  IF p_user_id != auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: can only complete own program days';
  END IF;
  
  -- Get program day data to calculate sets, reps AND seconds
  SELECT * INTO v_programday_data
  FROM programday 
  WHERE id = p_programday_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Program day not found';
  END IF;
  
  -- Calculate total sets from program day
  v_total_sets := COALESCE(v_programday_data.sets1, 0) + 
                  COALESCE(v_programday_data.sets2, 0) + 
                  COALESCE(v_programday_data.sets3, 0) + 
                  COALESCE(v_programday_data.sets4, 0) + 
                  COALESCE(v_programday_data.sets5, 0);
  
  -- Calculate total reps: sets × reps for each exercise
  v_total_reps := COALESCE(v_programday_data.sets1, 0) * COALESCE(v_programday_data.reps1, 0) + 
                  COALESCE(v_programday_data.sets2, 0) * COALESCE(v_programday_data.reps2, 0) + 
                  COALESCE(v_programday_data.sets3, 0) * COALESCE(v_programday_data.reps3, 0) + 
                  COALESCE(v_programday_data.sets4, 0) * COALESCE(v_programday_data.reps4, 0) + 
                  COALESCE(v_programday_data.sets5, 0) * COALESCE(v_programday_data.reps5, 0);
  
  -- Calculate total seconds: sets × seconds for each exercise
  v_total_seconds := COALESCE(v_programday_data.sets1, 0) * COALESCE(v_programday_data.seconds1, 0) + 
                     COALESCE(v_programday_data.sets2, 0) * COALESCE(v_programday_data.seconds2, 0) + 
                     COALESCE(v_programday_data.sets3, 0) * COALESCE(v_programday_data.seconds3, 0) + 
                     COALESCE(v_programday_data.sets4, 0) * COALESCE(v_programday_data.seconds4, 0) + 
                     COALESCE(v_programday_data.sets5, 0) * COALESCE(v_programday_data.seconds5, 0);
  
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
  
  -- Mark as complete with proper sets, reps AND seconds tracking
  INSERT INTO userprogress (user_id, programday_id, completed_at, done, sets, total_sets, reps, total_reps, total_seconds)
  VALUES (p_user_id, p_programday_id, NOW(), true, v_total_sets, v_total_sets, v_total_reps, v_total_reps, v_total_seconds);
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Program day completed',
    'completed_at', NOW(),
    'sets_completed', v_total_sets,
    'reps_completed', v_total_reps,
    'seconds_completed', v_total_seconds
  );
END;
$function$;