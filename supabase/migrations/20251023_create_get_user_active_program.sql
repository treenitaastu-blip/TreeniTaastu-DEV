-- Create get_user_active_program function
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
  -- Check if user has an active program
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.description,
    p.duration_days,
    p.difficulty,
    p.status,
    p.created_at
  FROM programs p
  JOIN user_programs up ON p.id = up.program_id
  WHERE up.user_id = p_user_id 
    AND up.status = 'active'
  LIMIT 1;
  
  -- If no active program found, return fallback for Kontorikeha Reset
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      'kontorikeha-reset'::uuid as id,
      'Kontorikeha Reset'::text as title,
      '20-päevane programm kontoritöötajatele, mis aitab parandada kehahoiakut ja vähendada põhja- ja kaelavalusid.'::text as description,
      20::integer as duration_days,
      'alustaja'::text as difficulty,
      'available'::text as status,
      now()::timestamp with time zone as created_at;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_active_program(uuid) TO authenticated;
