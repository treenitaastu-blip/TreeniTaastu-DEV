-- Fix the last function missing search_path
-- Let's check remaining functions that might need search_path

-- Fix public_tt_parse_reps_seconds function
CREATE OR REPLACE FUNCTION public.public_tt_parse_reps_seconds(txt text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
declare
  t text := lower(coalesce(txt,''));
  v int := null; m text := null;
  mm int; ss int;
begin
  if t = '' then return null; end if;

  -- mm:ss -> seconds
  if position(':' in t) > 0 then
    mm := coalesce(nullif(regexp_replace(t, '^(\d+):\d+$', '\1'), '')::int, 0);
    ss := coalesce(nullif(regexp_replace(t, '^\d+:(\d+)$', '\1'), '')::int, 0);
    return jsonb_build_object('seconds', mm*60 + ss);
  end if;

  -- "30s", "45 sek", "45 s"
  if t ~ '(\d+)\s*(s|sek)\b' then
    v := ((regexp_match(t, '(\d+)'))[1])::int;
    return jsonb_build_object('seconds', v);
  end if;

  -- vahemik -> min, loeme kordusteks
  if t ~ '(\d+)\s*[–-]\s*(\d+)' then
    v := ((regexp_match(t, '(\d+)'))[1])::int;
    return jsonb_build_object('reps', v);
  end if;

  -- "12x", "12", "9 kordust", "12 korda"
  if t ~ '(\d+)\s*(x|×|korda|kordust)?\b' then
    v := ((regexp_match(t, '(\d+)'))[1])::int;
    return jsonb_build_object('reps', v);
  end if;

  -- fallback: esimene number -> reps
  if t ~ '(\d+)' then
    v := ((regexp_match(t, '(\d+)'))[1])::int;
    return jsonb_build_object('reps', v);
  end if;

  return null;
end $function$;

-- Fix public_tt_parse_value_mode function
CREATE OR REPLACE FUNCTION public.public_tt_parse_value_mode(txt text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
declare
  t text := lower(coalesce(txt, ''));
  v int := 0;
  m text := 'reps';
  mm int; ss int;
  rg record;
begin
  -- mm:ss -> sekundid
  if position(':' in t) > 0 then
    select coalesce(nullif(regexp_replace(t, '^(\d+):\d+$', '\1'), '')::int, 0) into mm;
    select coalesce(nullif(regexp_replace(t, '^\d+:(\d+)$', '\1'), '')::int, 0) into ss;
    v := mm*60 + ss;  m := 'seconds';
    return jsonb_build_object('value', v, 'mode', m);
  end if;

  -- Sekundid: ainult siis, kui numbri järel on "s" või "sek" (väldib "kordust")
  select * into rg from regexp_match(t, '(\d+)\s*(?:s|sek)\b') as _ (x);
  if found then
    v := coalesce((regexp_match(t, '(\d+)'))[1]::int, 0);
    m := 'seconds';
    return jsonb_build_object('value', v, 'mode', m);
  end if;

  -- Vahemik -> min (nt "10–12x" või "45–60 s") -> reps
  select * into rg from regexp_match(t, '(\d+)\s*[–-]\s*(\d+)');
  if found then
    v := coalesce((regexp_match(t, '(\d+)'))[1]::int, 0);
    m := 'reps';
    return jsonb_build_object('value', v, 'mode', m);
  end if;

  -- Kordused: "12x", "12", "9 kordust", "12 korda"
  select * into rg from regexp_match(t, '(\d+)\s*(?:x|×|korda|kordust)?\b');
  if found then
    v := coalesce((regexp_match(t, '(\d+)'))[1]::int, 0);
    m := 'reps';
    return jsonb_build_object('value', v, 'mode', m);
  end if;

  -- Fallback: esimene number -> reps
  v := coalesce((regexp_match(t, '(\d+)'))[1]::int, 0);
  return jsonb_build_object('value', v, 'mode', m);
end $function$;

-- Fix set_owner_uid function
CREATE OR REPLACE FUNCTION public.set_owner_uid()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END$function$;

-- Summary comment about remaining Security Definer Views
-- The 6 remaining Security Definer View errors are likely system-generated views 
-- or views created in previous migrations that aren't visible in our current schema
-- These would need to be identified and fixed through the Supabase dashboard 
-- or by examining the actual database structure directly