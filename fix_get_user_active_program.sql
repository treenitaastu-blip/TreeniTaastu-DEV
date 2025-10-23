-- Fix get_user_active_program function
-- Run this directly in Supabase SQL Editor

-- Drop the function if it exists
DROP FUNCTION IF EXISTS public.get_user_active_program(uuid);

-- Create get_user_active_program function using existing client_programs table
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
  
  -- If no active client program found, return fallback for Kontorikeha Reset
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      gen_random_uuid() as id, -- Generate proper UUID instead of invalid string
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
