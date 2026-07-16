-- Keep the admin user list complete even when an older signup missed the
-- public profile trigger. Auth is the source of truth for registered users;
-- profiles only enrich those users with application-specific data.

-- Repair historical Auth users that do not have a public profile. Do not
-- overwrite an existing role or creation date.
INSERT INTO public.profiles(id, email, created_at, role, full_name)
SELECT
  auth_user.id,
  auth_user.email,
  auth_user.created_at,
  'user',
  NULLIF(auth_user.raw_user_meta_data->>'full_name', '')
FROM auth.users AS auth_user
ON CONFLICT (id) DO UPDATE SET
  email = COALESCE(EXCLUDED.email, profiles.email),
  full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

-- Create the trigger only when it is missing. Keeping the existing trigger in
-- place avoids a destructive drop/recreate operation in established projects.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_ensure_trial_on_signup'
      AND tgrelid = 'auth.users'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER trg_ensure_trial_on_signup
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.ensure_trial_on_signup();
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.get_admin_users_v2()
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  role text,
  created_at timestamptz,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  profile_exists boolean,
  is_paid boolean,
  trial_ends_at timestamptz,
  current_period_end timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin_secure(auth.uid()) THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    auth_user.id,
    COALESCE(auth_user.email, profile.email)::text,
    profile.full_name::text,
    (CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.user_roles AS user_role
        WHERE user_role.user_id = auth_user.id
          AND user_role.role = 'admin'::public.app_role
      ) OR profile.role = 'admin' THEN 'admin'
      ELSE 'user'
    END)::text,
    auth_user.created_at,
    auth_user.email_confirmed_at,
    auth_user.last_sign_in_at,
    profile.id IS NOT NULL,
    COALESCE(subscriber.status = 'active', false),
    COALESCE(subscriber.trial_ends_at, profile.trial_ends_at),
    COALESCE(subscriber.expires_at, profile.current_period_end)
  FROM auth.users AS auth_user
  LEFT JOIN public.profiles AS profile ON profile.id = auth_user.id
  LEFT JOIN LATERAL (
    SELECT
      subscription.status,
      subscription.trial_ends_at,
      subscription.expires_at
    FROM public.subscribers AS subscription
    WHERE subscription.user_id = auth_user.id
    ORDER BY subscription.created_at DESC NULLS LAST
    LIMIT 1
  ) AS subscriber ON true
  ORDER BY auth_user.created_at DESC;
END
$$;

REVOKE ALL ON FUNCTION public.get_admin_users_v2() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_users_v2() TO authenticated;

COMMENT ON FUNCTION public.get_admin_users_v2() IS
'Admin-only Auth-backed user directory. Includes registered users even when profile enrichment is missing.';
