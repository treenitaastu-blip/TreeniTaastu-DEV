-- Fix get_user_active_program to properly check for programs
-- The UNION ALL approach might have issues - let's use a more explicit check
-- Using SELECT INTO with IF FOUND works reliably

CREATE OR REPLACE FUNCTION public.get_user_active_program(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  duration_days integer,
  difficulty text,
  status text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- First priority: Check for active client program (personal training)
  SELECT 
    cp.id,
    COALESCE(cp.title_override, wt.title) as title,
    COALESCE(wt.goal, 'Personaaltreening programm') as description,
    (cp.duration_weeks * 7)::integer as duration_days,
    'kohandatud'::text as difficulty,
    cp.status,
    cp.inserted_at as created_at
  INTO v_result
  FROM client_programs cp
  LEFT JOIN workout_templates wt ON wt.id = cp.template_id
  WHERE cp.assigned_to = p_user_id 
    AND cp.status = 'active'
  LIMIT 1;
  
  -- If found, return it
  IF FOUND THEN
    RETURN QUERY SELECT 
      v_result.id,
      v_result.title,
      v_result.description,
      v_result.duration_days,
      v_result.difficulty,
      v_result.status,
      v_result.created_at;
    RETURN;
  END IF;
  
  -- Second priority: Check for active static program
  SELECT 
    p.id,
    p.title,
    p.description,
    (p.duration_weeks * 7)::integer as duration_days,
    'alustaja'::text as difficulty,
    'available'::text as status,
    p.created_at
  INTO v_result
  FROM programs p
  INNER JOIN user_programs up ON up.program_id = p.id
  WHERE up.user_id = p_user_id
    AND up.status = 'active'
  LIMIT 1;
  
  -- If found, return it
  IF FOUND THEN
    RETURN QUERY SELECT 
      v_result.id,
      v_result.title,
      v_result.description,
      v_result.duration_days,
      v_result.difficulty,
      v_result.status,
      v_result.created_at;
    RETURN;
  END IF;
  
  -- If no program found, return empty result
  -- Frontend will handle this and show empty state
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_active_program(uuid) TO authenticated;
