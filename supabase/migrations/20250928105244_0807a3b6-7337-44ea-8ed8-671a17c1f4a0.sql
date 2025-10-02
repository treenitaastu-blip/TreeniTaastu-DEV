-- Fix functions without proper search_path configuration

-- Update trigger functions to have search_path
CREATE OR REPLACE FUNCTION public.archive_old_conversations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Archive previous active conversations for this user
  UPDATE public.support_conversations
  SET status = 'archived',
      updated_at = now()
  WHERE user_id = NEW.user_id
    AND status = 'active'
    AND id != NEW.id;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_owner_uid()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at_user_roles()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_client_item_order()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.order_in_day IS NULL THEN
    SELECT COALESCE(MAX(order_in_day),0) + 1
      INTO NEW.order_in_day
      FROM public.client_items
     WHERE client_day_id = NEW.client_day_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_template_item_order()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.order_in_day IS NULL THEN
    SELECT COALESCE(MAX(order_in_day),0) + 1
      INTO NEW.order_in_day
      FROM public.template_items
     WHERE template_day_id = NEW.template_day_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Update utility functions
CREATE OR REPLACE FUNCTION public.parse_first_int(txt text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE m text;
BEGIN
  IF txt IS NULL THEN RETURN NULL; END IF;
  m := (regexp_match(txt, '(\d+)'))[1];
  RETURN m::int;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_iso_week(date_input timestamp with time zone DEFAULT now())
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  -- Convert to Europe/Tallinn timezone and get ISO week
  RETURN to_char(date_input AT TIME ZONE 'Europe/Tallinn', 'IYYY-"W"IW');
END;
$$;

CREATE OR REPLACE FUNCTION public.public_tt_parse_reps_seconds(txt text)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  t text := lower(coalesce(txt,''));
  v int := null; 
  mm int; ss int;
BEGIN
  IF t = '' THEN RETURN NULL; END IF;

  -- mm:ss -> seconds
  IF position(':' in t) > 0 THEN
    mm := coalesce(nullif(regexp_replace(t, '^(\d+):\d+$', '\1'), '')::int, 0);
    ss := coalesce(nullif(regexp_replace(t, '^\d+:(\d+)$', '\1'), '')::int, 0);
    RETURN jsonb_build_object('seconds', mm*60 + ss);
  END IF;

  -- "30s", "45 sek", "45 s"
  IF t ~ '(\d+)\s*(s|sek)\b' THEN
    v := ((regexp_match(t, '(\d+)'))[1])::int;
    RETURN jsonb_build_object('seconds', v);
  END IF;

  -- vahemik -> min, loeme kordusteks
  IF t ~ '(\d+)\s*[–-]\s*(\d+)' THEN
    v := ((regexp_match(t, '(\d+)'))[1])::int;
    RETURN jsonb_build_object('reps', v);
  END IF;

  -- "12x", "12", "9 kordust", "12 korda"
  IF t ~ '(\d+)\s*(x|×|korda|kordust)?\b' THEN
    v := ((regexp_match(t, '(\d+)'))[1])::int;
    RETURN jsonb_build_object('reps', v);
  END IF;

  -- fallback: esimene number -> reps
  IF t ~ '(\d+)' THEN
    v := ((regexp_match(t, '(\d+)'))[1])::int;
    RETURN jsonb_build_object('reps', v);
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_column(schemaname text, tablename text, colname text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = schemaname
      AND table_name   = tablename
      AND column_name  = colname
  );
$$;