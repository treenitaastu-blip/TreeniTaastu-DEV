-- Fix remaining security issues from linter

-- 1. Fix Security Definer Views - Convert them to regular views or add proper security
-- First, let's identify and fix the views that are using SECURITY DEFINER

-- Note: The actual views with SECURITY DEFINER aren't visible in the schema provided,
-- but based on the linter results, we need to either:
-- a) Remove SECURITY DEFINER from views, or 
-- b) Add proper RLS policies

-- 2. Fix remaining functions with missing search_path
-- These functions appear to be missing proper search_path settings

-- Fix any remaining functions that might be missing search_path
-- Let's be systematic about this by checking common functions

-- Fix combine_policies function (if it exists and needs search_path)
CREATE OR REPLACE FUNCTION public.combine_policies(_schema text, _table text, _role name, _cmd character, _newname text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
declare
  _rel regclass := format('%I.%I', _schema, _table)::regclass;
  _using_conds   text := null;
  _check_conds   text := null;
  _rec record;
  _sql text;
  _exists boolean;
begin
  -- Gather USING / WITH CHECK from all matching policies except the target name
  for _rec in
    select polname,
           pg_get_expr(polqual,      polrelid) as using_expr,
           pg_get_expr(polwithcheck, polrelid) as check_expr
    from pg_policy
    where polrelid = _rel
      and _role::regrole = any(polroles)
      and polcmd = _cmd
      and polname <> _newname
  loop
    if _rec.using_expr is not null then
      _using_conds := coalesce(_using_conds || ' OR ', '') || '(' || _rec.using_expr || ')';
    end if;
    if _rec.check_expr is not null then
      _check_conds := coalesce(_check_conds || ' OR ', '') || '(' || _rec.check_expr || ')';
    end if;
  end loop;

  -- Nothing to combine? bail.
  if _using_conds is null and _check_conds is null then
    return;
  end if;

  -- INSERT cares about WITH CHECK; if we only have USING, reuse it as CHECK
  if _cmd = 'a' and _check_conds is null and _using_conds is not null then
    _check_conds := _using_conds;
  end if;

  -- If the target policy name already exists, drop it so we can recreate
  select exists(
    select 1 from pg_policy where polrelid = _rel and polname = _newname
  ) into _exists;

  if _exists then
    execute format('drop policy %I on %s', _newname, _rel);
  end if;

  -- Build CREATE POLICY
  _sql := format(
    'create policy %I on %s for %s to %I',
    _newname, _rel,
    case _cmd when 'r' then 'select'
              when 'a' then 'insert'
              when 'w' then 'update'
              when 'd' then 'delete' end,
    _role
  );

  -- USING is irrelevant for INSERT, keep it for r/w/d only
  if _using_conds is not null and _cmd <> 'a' then
    _sql := _sql || format(' using (%s)', _using_conds);
  end if;
  if _check_conds is not null then
    _sql := _sql || format(' with check (%s)', _check_conds);
  end if;

  execute _sql;

  -- Drop the originals we just merged
  for _rec in
    select polname
    from pg_policy
    where polrelid = _rel
      and _role::regrole = any(polroles)
      and polcmd = _cmd
      and polname <> _newname
  loop
    execute format('drop policy %I on %s', _rec.polname, _rel);
  end loop;
end
$function$;

-- Ensure end_rest function has proper search_path
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
END; 
$function$;

-- Ensure mark_set_done function has proper search_path
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
END; 
$function$;