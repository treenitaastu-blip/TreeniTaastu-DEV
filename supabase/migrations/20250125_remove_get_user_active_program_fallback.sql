-- Remove fallback from get_user_active_program function
-- This prevents the function from always returning Kontorikeha Reset
-- when user has no active program, which was causing false "active" status

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
BEGIN
  -- Check if user has an active client program (personal training)
  RETURN QUERY
  SELECT 
    cp.id,
    COALESCE(cp.title_override, wt.title) as title,
    COALESCE(wt.goal, 'Personaaltreening programm') as description,
    (cp.duration_weeks * 7)::integer as duration_days, -- Convert weeks to days
    'kohandatud'::text as difficulty,
    cp.status,
    cp.inserted_at as created_at
  FROM client_programs cp
  LEFT JOIN workout_templates wt ON wt.id = cp.template_id
  WHERE cp.assigned_to = p_user_id 
    AND cp.status = 'active'
  LIMIT 1;
  
  -- If no active client program found, check for active static program
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      p.id,
      p.title,
      p.description,
      (p.duration_weeks * 7)::integer as duration_days,
      'alustaja'::text as difficulty, -- Default difficulty for static programs
      'available'::text as status,
      p.created_at
    FROM programs p
    INNER JOIN user_programs up ON up.program_id = p.id
    WHERE up.user_id = p_user_id
      AND up.status = 'active'
    LIMIT 1;
  END IF;
  
  -- If still no program found, return empty result
  -- Frontend will handle this and show empty state
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_active_program(uuid) TO authenticated;
