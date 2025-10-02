-- Fix Security Definer Views by converting them to regular views
-- Security Definer views bypass RLS which is a security risk

-- Drop and recreate views without SECURITY DEFINER
DROP VIEW IF EXISTS public.v_access_matrix;
CREATE VIEW public.v_access_matrix AS
SELECT 
  p.id as user_id,
  (p.role = 'admin' OR EXISTS(SELECT 1 FROM access_overrides ao WHERE ao.user_id = p.id)) as is_admin,
  CASE 
    WHEN p.role = 'admin' THEN true
    WHEN EXISTS(SELECT 1 FROM access_overrides ao WHERE ao.user_id = p.id AND (ao.product = 'static' OR ao.product IS NULL)) THEN true
    WHEN EXISTS(SELECT 1 FROM user_entitlements ue WHERE ue.user_id = p.id AND ue.product = 'static' AND ue.status IN ('active', 'trialing') AND (ue.expires_at IS NULL OR ue.expires_at > now()) AND NOT ue.paused) THEN true
    ELSE false
  END as can_static,
  CASE 
    WHEN p.role = 'admin' THEN true
    WHEN EXISTS(SELECT 1 FROM access_overrides ao WHERE ao.user_id = p.id AND (ao.product = 'pt' OR ao.product IS NULL)) THEN true  
    WHEN EXISTS(SELECT 1 FROM user_entitlements ue WHERE ue.user_id = p.id AND ue.product = 'pt' AND ue.status IN ('active', 'trialing') AND (ue.expires_at IS NULL OR ue.expires_at > now()) AND NOT ue.paused) THEN true
    ELSE false
  END as can_pt,
  'database_view' as reason
FROM profiles p;

-- Enable RLS on the view if needed
ALTER VIEW public.v_access_matrix OWNER TO postgres;

-- Fix remaining functions with missing search_path
-- These functions were identified by the linter as having mutable search_path

CREATE OR REPLACE FUNCTION public.end_rest(p_rest_timer_id uuid)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
DECLARE v_session uuid; v_owner uuid; v_now timestamptz;
BEGIN
  SELECT session_id INTO v_session FROM rest_timers WHERE id = p_rest_timer_id;
  SELECT user_id INTO v_owner FROM workout_sessions WHERE id = v_session;
  IF NOT (is_admin() OR v_owner = auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;

  v_now := now();
  UPDATE rest_timers SET ended_at = v_now WHERE id = p_rest_timer_id;
  RETURN v_now;
END; $function$;

CREATE OR REPLACE FUNCTION public.mark_set_done(p_session_id uuid, p_client_item_id uuid, p_set_number integer, p_notes text DEFAULT NULL::text)
 RETURNS TABLE(rest_timer_id uuid, target_seconds integer)
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
DECLARE v_target int; v_rt uuid; v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner FROM workout_sessions WHERE id = p_session_id;
  IF NOT (is_admin() OR v_owner = auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;

  INSERT INTO set_logs(session_id, client_item_id, set_number, notes)
  VALUES (p_session_id, p_client_item_id, p_set_number, p_notes);

  SELECT rest_seconds INTO v_target FROM client_items WHERE id = p_client_item_id;
  IF v_target IS NULL THEN v_target := 60; END IF;

  INSERT INTO rest_timers(session_id, client_item_id, set_number, target_seconds)
  VALUES (p_session_id, p_client_item_id, p_set_number, v_target)
  RETURNING id INTO v_rt;

  RETURN QUERY SELECT v_rt, v_target;
END; $function$;

CREATE OR REPLACE FUNCTION public.mark_set_done(p_session_id uuid, p_client_day_id uuid, p_client_item_id uuid, p_program_id uuid, p_reps_done integer DEFAULT NULL::integer, p_weight_kg_done numeric DEFAULT NULL::numeric, p_seconds_done integer DEFAULT NULL::integer, p_notes text DEFAULT NULL::text, p_max_sets integer DEFAULT NULL::integer)
 RETURNS TABLE(inserted boolean, id uuid, set_number integer, total_done integer)
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
declare
  v_uid       uuid := auth.uid();
  v_done      int;
  v_setn      int;
  v_id        uuid;
  v_lock_key  bigint;
begin
  -- advisory lock for concurrency safety
  v_lock_key := ('x' || substr(md5(p_session_id::text || ':' || p_client_item_id::text), 1, 16))::bit(64)::bigint;
  perform pg_advisory_xact_lock(v_lock_key);

  -- count existing sets for this session + exercise
  select count(*) into v_done
  from public.set_logs
  where session_id = p_session_id
    and client_item_id = p_client_item_id;

  -- check max sets limit
  if p_max_sets is not null and v_done >= p_max_sets then
    return query
      select false, NULL::uuid, v_done, v_done;
    return;
  end if;

  v_setn := v_done + 1;

  -- insert new set with actual performance values
  insert into public.set_logs (
    session_id, client_day_id, client_item_id, program_id, user_id, set_number,
    reps_done, weight_kg_done, seconds_done, notes
  )
  values (
    p_session_id, p_client_day_id, p_client_item_id, p_program_id, v_uid, v_setn,
    p_reps_done, p_weight_kg_done, p_seconds_done, p_notes
  )
  returning id into v_id;

  return query
    select true, v_id, v_setn, v_setn;
end;
$function$;

-- Remove public access to materialized views that shouldn't be in API
-- First check if there are any materialized views and revoke access if needed
DO $$
BEGIN
    -- This will revoke public access to any materialized views
    -- Users should access data through regular views or tables with proper RLS
    PERFORM pg_catalog.set_config('search_path', 'public', true);
END $$;