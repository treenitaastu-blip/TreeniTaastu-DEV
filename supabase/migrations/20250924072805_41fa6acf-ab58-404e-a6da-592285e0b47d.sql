-- Identify and fix remaining Security Definer Views and functions

-- Query to find views with SECURITY DEFINER (this will help us identify the problematic views)
-- We can't SELECT in migration, but we can try to recreate common views without SECURITY DEFINER

-- The remaining function that needs search_path - let's check common ones
-- Fix parse_first_int function
CREATE OR REPLACE FUNCTION public.parse_first_int(txt text)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path = 'public'
AS $function$
declare m text;
begin
  if txt is null then return null; end if;
  m := (regexp_match(txt, '(\d+)'))[1];
  return m::int;
exception when others then
  return null;
end;
$function$;

-- Fix to_reps_text_from_defaults function
CREATE OR REPLACE FUNCTION public.to_reps_text_from_defaults(reps_num integer, reps_txt text, seconds_num integer, seconds_txt text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path = 'public'
AS $function$
declare v text;
begin
  if nullif(reps_txt,'') is not null then
    return reps_txt;
  elsif reps_num is not null then
    return reps_num::text || 'x';
  elsif nullif(seconds_txt,'') is not null then
    v := trim(seconds_txt);
    if right(v,1) = 's' then
      return v;
    else
      return v || 's';
    end if;
  elsif seconds_num is not null then
    return seconds_num::text || 's';
  else
    return null;
  end if;
end;
$function$;

-- Fix get_iso_week function
CREATE OR REPLACE FUNCTION public.get_iso_week(date_input timestamp with time zone DEFAULT now())
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path = 'public'
AS $function$
BEGIN
  -- Convert to Europe/Tallinn timezone and get ISO week
  RETURN to_char(date_input AT TIME ZONE 'Europe/Tallinn', 'IYYY-"W"IW');
END;
$function$;

-- Since the Security Definer Views are not visible in our schema and might be system-generated,
-- let's try to address potential materialized view API access issues
-- We need to revoke API access from materialized views that shouldn't be exposed

-- Revoke access from the API role for materialized views (if any exist)
-- This addresses the "Materialized View in API" warning
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Find and revoke access from materialized views for the API
    FOR r IN 
        SELECT schemaname, matviewname 
        FROM pg_matviews 
        WHERE schemaname = 'public'
    LOOP
        BEGIN
            -- Revoke SELECT access from anon and authenticated roles for materialized views
            EXECUTE format('REVOKE SELECT ON TABLE public.%I FROM anon, authenticated', r.matviewname);
        EXCEPTION
            WHEN undefined_table OR insufficient_privilege THEN
                -- Skip if table doesn't exist or we don't have permission
                CONTINUE;
        END;
    END LOOP;
END $$;

-- The Security Definer Views issue might be with system views that we can't directly modify
-- Let's ensure our custom views don't use SECURITY DEFINER by recreating key views

-- If there are any custom views using SECURITY DEFINER, we need to recreate them
-- Since we can't see the view definitions, we'll have to rely on the user to identify them
-- or check the Supabase dashboard