-- Security hardening: remove self-promotion/debug helpers and make user_roles
-- the only application-level source of administrator privileges.

DROP FUNCTION IF EXISTS public.make_current_user_admin();
DROP FUNCTION IF EXISTS public.test_admin_login(text);
DROP FUNCTION IF EXISTS public.debug_auth_status();

-- Remove the legacy overload that allowed callers to choose assigned_by.
DROP FUNCTION IF EXISTS public.assign_template_to_user_v2(uuid, text, date, uuid);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND _user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = _role
    )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_secure(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND _user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'::public.app_role
    )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT public.is_admin_secure(auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.is_admin_unified()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin_secure(auth.uid())
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin_secure(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin_unified() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_unified() TO authenticated;

-- A user may create their own profile, but may not choose an admin role while
-- doing so. Updates are additionally protected by prevent_role_changes().
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  id = auth.uid()
  AND COALESCE(role, 'user') <> 'admin'
);

DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_self_or_admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.is_admin_secure(auth.uid()));

-- These functions are called from the authenticated admin UI, so every call
-- must check the caller instead of trusting the function name or API key.
CREATE OR REPLACE FUNCTION public.admin_set_entitlement_service(
  p_user uuid,
  p_product text,
  p_status text,
  p_days integer DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_until timestamptz := CASE
    WHEN p_days IS NULL THEN NULL
    ELSE now() + make_interval(days => p_days)
  END;
BEGIN
  IF NOT public.is_admin_secure(auth.uid()) THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_days IS NOT NULL AND (p_days < 0 OR p_days > 3650) THEN
    RAISE EXCEPTION 'invalid entitlement duration' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_entitlements(
    user_id, product, status, started_at, trial_ends_at, expires_at,
    paused, source, note
  )
  VALUES (
    p_user, p_product::public.product_kind, p_status, now(),
    CASE WHEN p_status = 'trialing' THEN v_until ELSE NULL END,
    CASE WHEN p_status = 'active' THEN v_until ELSE NULL END,
    false, 'manual', p_note
  )
  ON CONFLICT(user_id, product) DO UPDATE
  SET status = EXCLUDED.status,
      trial_ends_at = EXCLUDED.trial_ends_at,
      expires_at = EXCLUDED.expires_at,
      paused = false,
      note = COALESCE(EXCLUDED.note, user_entitlements.note),
      updated_at = now();
END
$$;

CREATE OR REPLACE FUNCTION public.admin_pause_entitlement_service(
  p_user uuid,
  p_product text,
  p_pause boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_secure(auth.uid()) THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.user_entitlements
  SET paused = p_pause, updated_at = now()
  WHERE user_id = p_user
    AND product = p_product::public.product_kind;
END
$$;

CREATE OR REPLACE FUNCTION public.admin_clear_entitlement_service(
  p_user uuid,
  p_product text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_secure(auth.uid()) THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.user_entitlements
  WHERE user_id = p_user
    AND product = p_product::public.product_kind;
END
$$;

REVOKE ALL ON FUNCTION public.admin_set_entitlement_service(uuid, text, text, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_pause_entitlement_service(uuid, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_clear_entitlement_service(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_entitlement_service(uuid, text, text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_pause_entitlement_service(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_clear_entitlement_service(uuid, text) TO authenticated;

-- Batch updates bypass table RLS, therefore they are admin-only.
CREATE OR REPLACE FUNCTION public.batch_update_exercises(updates jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  update_item jsonb;
  updated_count integer := 0;
BEGIN
  IF NOT public.is_admin_secure(auth.uid()) THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;
  IF updates IS NULL OR jsonb_typeof(updates) <> 'array' OR jsonb_array_length(updates) > 500 THEN
    RAISE EXCEPTION 'invalid update batch' USING ERRCODE = '22023';
  END IF;

  FOR update_item IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    UPDATE public.client_items
    SET weight_kg = COALESCE((update_item->>'weight_kg')::numeric, weight_kg),
        reps = COALESCE(update_item->>'reps', reps),
        sets = COALESCE((update_item->>'sets')::integer, sets)
    WHERE id = (update_item->>'id')::uuid;
    updated_count := updated_count + CASE WHEN FOUND THEN 1 ELSE 0 END;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'updated_count', updated_count);
END
$$;

REVOKE ALL ON FUNCTION public.batch_update_exercises(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.batch_update_exercises(jsonb) TO authenticated;

-- System-wide statistics expose other users' activity and are admin-only.
DROP FUNCTION IF EXISTS public.get_pt_system_stats();
CREATE FUNCTION public.get_pt_system_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_admin_secure(auth.uid()) THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'total_programs', COUNT(*),
    'active_programs', COUNT(*) FILTER (WHERE is_active IS NOT FALSE),
    'total_clients', COUNT(DISTINCT assigned_to),
    'completed_sessions', (
      SELECT COUNT(*) FROM public.workout_sessions WHERE ended_at IS NOT NULL
    )
  )
  INTO result
  FROM public.client_programs;

  RETURN result;
END
$$;

REVOKE ALL ON FUNCTION public.get_pt_system_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_pt_system_stats() TO authenticated;

-- Preserve the existing analytics implementation behind a caller-checking
-- wrapper. Clients may read their own analytics; admins may read any client.
ALTER FUNCTION public.get_client_analytics(uuid)
  RENAME TO get_client_analytics_unchecked_20260715;

CREATE FUNCTION public.get_client_analytics(p_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  email text,
  total_sessions bigint,
  completed_sessions bigint,
  completion_rate numeric,
  total_volume_kg numeric,
  total_reps bigint,
  total_sets bigint,
  avg_rpe numeric,
  current_streak integer,
  best_streak integer,
  last_workout_date timestamptz,
  first_workout_date timestamptz,
  active_programs bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS NULL OR (
    p_user_id <> auth.uid() AND NOT public.is_admin_secure(auth.uid())
  ) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT * FROM public.get_client_analytics_unchecked_20260715(p_user_id);
END
$$;

ALTER FUNCTION public.get_client_weekly_analytics(uuid, integer)
  RENAME TO get_client_weekly_analytics_unchecked_20260715;

CREATE FUNCTION public.get_client_weekly_analytics(
  p_user_id uuid,
  p_weeks integer DEFAULT 12
)
RETURNS TABLE(
  week_start date,
  sessions bigint,
  volume_kg numeric,
  avg_rpe numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS NULL OR (
    p_user_id <> auth.uid() AND NOT public.is_admin_secure(auth.uid())
  ) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;
  IF p_weeks IS NULL OR p_weeks < 1 OR p_weeks > 104 THEN
    RAISE EXCEPTION 'invalid week range' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT * FROM public.get_client_weekly_analytics_unchecked_20260715(p_user_id, p_weeks);
END
$$;

REVOKE ALL ON FUNCTION public.get_client_analytics_unchecked_20260715(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_client_weekly_analytics_unchecked_20260715(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_client_analytics(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_client_weekly_analytics(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_client_analytics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_weekly_analytics(uuid, integer) TO authenticated;

-- Internal diagnostics must never be exposed through the public API.
REVOKE ALL ON FUNCTION public.get_workout_failure_stats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_error_resolved(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_progression_analysis_failure_resolved(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_workout_failure_resolved(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_workout_failure_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_error_resolved(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_progression_analysis_failure_resolved(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_workout_failure_resolved(uuid) TO service_role;

-- Explicitly remove implicit PUBLIC execution from remaining admin RPCs.
CREATE OR REPLACE FUNCTION public.get_admin_access_matrix()
RETURNS TABLE(user_id uuid, is_admin boolean, can_static boolean, can_pt boolean, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_secure(auth.uid()) THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT m.user_id, m.is_admin, m.can_static, m.can_pt, m.reason
  FROM public.v_access_matrix AS m;
END
$$;

CREATE OR REPLACE FUNCTION public.get_admin_entitlements()
RETURNS TABLE(
  user_id uuid,
  product text,
  status text,
  trial_ends_at timestamptz,
  expires_at timestamptz,
  paused boolean,
  source text,
  note text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_secure(auth.uid()) THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    e.user_id, e.product::text, e.status, e.trial_ends_at, e.expires_at,
    e.paused, e.source, e.note, e.created_at
  FROM public.user_entitlements AS e
  ORDER BY e.created_at DESC;
END
$$;

CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE(
  id uuid,
  email text,
  role text,
  created_at timestamptz,
  is_paid boolean,
  trial_ends_at timestamptz,
  current_period_end timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_secure(auth.uid()) THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p.id AND ur.role = 'admin'::public.app_role
      ) THEN 'admin'
      ELSE 'user'
    END,
    p.created_at,
    COALESCE(s.status = 'active', false),
    s.trial_ends_at,
    s.expires_at
  FROM public.profiles AS p
  LEFT JOIN public.subscribers AS s ON s.user_id = p.id
  ORDER BY p.created_at DESC;
END
$$;

REVOKE ALL ON FUNCTION public.get_admin_access_matrix() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_admin_entitlements() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_admin_users() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_client_program_cascade(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_template_cascade(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_access_matrix() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_entitlements() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_client_program_cascade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_template_cascade(uuid) TO authenticated;

-- Legacy user-listing RPC had no caller check and exposed every email address.
REVOKE ALL ON FUNCTION public.get_all_users() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users() TO service_role;

REVOKE ALL ON FUNCTION public.get_all_users_for_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_all_subscribers_for_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_all_user_roles_for_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_all_users_for_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_subscribers_for_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_user_roles_for_admin() TO authenticated;
