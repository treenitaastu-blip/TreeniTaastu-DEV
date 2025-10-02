-- Phase 1: Security Fixes (continued)

-- Check if RLS is enabled on timezones (if not, enable it)
DO $$
BEGIN
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'timezones' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER TABLE public.timezones ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 2. Fix search_path settings for functions that are missing them
-- Fix admin_set_override function that has no search_path
CREATE OR REPLACE FUNCTION public.admin_set_override(p_user uuid, p_product text, p_until timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
begin
  IF NOT is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  
  insert into user_entitlements (user_id, product, status, started_at, expires_at, paused, source, note)
  values (p_user, p_product, 'active', now(), p_until, false, 'override', 'admin override')
  on conflict (user_id, product) do update
    set status     = 'active',
        expires_at = excluded.expires_at,
        paused     = false,
        source     = excluded.source,
        note       = excluded.note,
        updated_at = now();
end;
$function$;

-- Fix has_column function search_path (currently uses pg_catalog, public which can be risky)
CREATE OR REPLACE FUNCTION public.has_column(schemaname text, tablename text, colname text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path = 'public'
AS $function$
  select exists (
    select 1
    from information_schema.columns
    where table_schema = schemaname
      and table_name   = tablename
      and column_name  = colname
  );
$function$;

-- 3. Review and fix potential security issues with SECURITY DEFINER functions
-- Fix track_user_event to ensure it only allows users to track their own events
CREATE OR REPLACE FUNCTION public.track_user_event(p_event_type text, p_event_data jsonb DEFAULT '{}'::jsonb, p_page_url text DEFAULT NULL::text, p_session_id text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
    v_event_id uuid;
    v_user_id uuid := auth.uid();
BEGIN
    -- Ensure user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'authentication required';
    END IF;
    
    -- Insert the event (only for authenticated user)
    INSERT INTO public.user_analytics_events (
        user_id, 
        event_type, 
        event_data, 
        page_url, 
        session_id
    )
    VALUES (
        v_user_id, 
        p_event_type, 
        p_event_data, 
        p_page_url, 
        p_session_id
    )
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END $function$;

-- Fix has_active_subscription to ensure proper auth check
CREATE OR REPLACE FUNCTION public.has_active_subscription(u uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  -- Only allow checking own subscription or admin access
  select CASE 
    WHEN u = auth.uid() OR is_admin() THEN
      coalesce(p.is_paid, false)
      or (p.current_period_end is not null and p.current_period_end > now())
      or (p.trial_ends_at is not null and p.trial_ends_at > now())
    ELSE false
  END
  from public.profiles p
  where p.id = u;
$function$;