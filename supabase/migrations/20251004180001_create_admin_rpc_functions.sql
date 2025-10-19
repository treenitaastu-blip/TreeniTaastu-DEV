-- Create RPC functions for admin access
-- These functions bypass RLS for authenticated admin users

-- Function to get all users for admin interface
CREATE OR REPLACE FUNCTION public.get_all_users_for_admin()
RETURNS TABLE (
  id uuid,
  email text,
  role text,
  created_at timestamptz,
  is_paid boolean,
  trial_ends_at timestamptz,
  current_period_end timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.email,
    p.role,
    p.created_at,
    p.is_paid,
    p.trial_ends_at,
    p.current_period_end
  FROM public.profiles p
  WHERE public.is_admin_secure(auth.uid())
  ORDER BY p.created_at DESC
  LIMIT 100;
$$;

-- Function to get all subscribers for admin interface
CREATE OR REPLACE FUNCTION public.get_all_subscribers_for_admin()
RETURNS TABLE (
  user_id uuid,
  status text,
  plan text,
  started_at timestamptz,
  trial_ends_at timestamptz,
  expires_at timestamptz,
  paused boolean,
  source text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.user_id,
    s.status,
    s.plan,
    s.started_at,
    s.trial_ends_at,
    s.expires_at,
    s.paused,
    s.source,
    s.created_at
  FROM public.subscribers s
  WHERE public.is_admin_secure(auth.uid())
  ORDER BY s.created_at DESC;
$$;

-- Function to get all user roles for admin interface
CREATE OR REPLACE FUNCTION public.get_all_user_roles_for_admin()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  role app_role,
  granted_by uuid,
  granted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ur.id,
    ur.user_id,
    ur.role,
    ur.granted_by,
    ur.granted_at,
    ur.created_at,
    ur.updated_at
  FROM public.user_roles ur
  WHERE public.is_admin_secure(auth.uid())
  ORDER BY ur.created_at DESC;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_users_for_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_subscribers_for_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_user_roles_for_admin() TO authenticated;
