-- Fix functions with correct column names from v_access_matrix

-- Fix finish_session function
CREATE OR REPLACE FUNCTION public.finish_session(p_session_id uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path = 'public'
AS $function$
  update public.workout_sessions
     set ended_at = now()
   where id = p_session_id
     and user_id = auth.uid()
     and ended_at is null;
$function$;

-- Fix start_session function  
CREATE OR REPLACE FUNCTION public.start_session(p_client_program_id uuid, p_client_day_id uuid)
 RETURNS uuid
 LANGUAGE sql
 SET search_path = 'public'
AS $function$
  WITH existing AS (
    SELECT id
    FROM public.workout_sessions
    WHERE user_id = auth.uid()
      AND client_program_id = p_client_program_id
      AND client_day_id     = p_client_day_id
      AND ended_at IS NULL
    LIMIT 1
  ),
  ins AS (
    INSERT INTO public.workout_sessions (user_id, client_program_id, client_day_id)
    SELECT auth.uid(), p_client_program_id, p_client_day_id
    WHERE NOT EXISTS (SELECT 1 FROM existing)
    RETURNING id
  )
  SELECT COALESCE((SELECT id FROM existing), (SELECT id FROM ins)) AS id;
$function$;

-- Fix end_session function
CREATE OR REPLACE FUNCTION public.end_session(p_session_id uuid)
 RETURNS uuid
 LANGUAGE sql
 SET search_path = 'public'
AS $function$
  UPDATE public.workout_sessions
     SET ended_at = now()
   WHERE id = p_session_id
     AND user_id = auth.uid()
     AND ended_at IS NULL
  RETURNING id;
$function$;

-- Fix is_subscriber function
CREATE OR REPLACE FUNCTION public.is_subscriber(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path = 'public'
AS $function$
  select exists(
    select 1
    from public.subscribers s
    where s.user_id = uid
      and coalesce(s.paused, false) = false
      and (
        (s.status = 'trialing' and coalesce(s.trial_ends_at, now() - interval '1 hour') > now())
        or
        (s.status = 'active' and (s.expires_at is null or s.expires_at > now()))
      )
  );
$function$;

-- Fix can_access_static function with correct column names
CREATE OR REPLACE FUNCTION public.can_access_static(u uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path = 'public'
AS $function$
  SELECT CASE 
    WHEN u != auth.uid() AND NOT is_admin() THEN false
    ELSE COALESCE((
      SELECT can_static
      FROM v_access_matrix WHERE user_id = u
    ), false)
  END;
$function$;

-- Fix can_access_pt function with correct column names  
CREATE OR REPLACE FUNCTION public.can_access_pt(u uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path = 'public'
AS $function$
  SELECT CASE 
    WHEN u != auth.uid() AND NOT is_admin() THEN false
    ELSE COALESCE((
      SELECT can_pt
      FROM v_access_matrix WHERE user_id = u
    ), false)
  END;
$function$;

-- Ensure workout_sessions table has proper RLS
DO $$
BEGIN
    -- Enable RLS on workout_sessions if not already enabled
    EXECUTE 'ALTER TABLE IF EXISTS public.workout_sessions ENABLE ROW LEVEL SECURITY';
EXCEPTION 
    WHEN undefined_table THEN
        -- Table doesn't exist, skip
        NULL;
END $$;