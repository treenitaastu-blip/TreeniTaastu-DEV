-- Fix admin access to profiles table for user management
-- This allows admins to view all profiles in the admin interface

-- Add policy for admins to view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin_secure(auth.uid()));

-- Add policy for admins to view all user roles
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin_secure(auth.uid()));

-- Add policy for admins to view all subscribers
DROP POLICY IF EXISTS "Admins can view all subscribers" ON public.subscribers;
CREATE POLICY "Admins can view all subscribers"
ON public.subscribers
FOR SELECT
TO authenticated
USING (public.is_admin_secure(auth.uid()));

-- Add policy for admins to manage subscribers
DROP POLICY IF EXISTS "Admins can manage subscribers" ON public.subscribers;
CREATE POLICY "Admins can manage subscribers"
ON public.subscribers
FOR ALL
TO authenticated
USING (public.is_admin_secure(auth.uid()))
WITH CHECK (public.is_admin_secure(auth.uid()));

-- Add policy for admins to manage user roles
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_admin_secure(auth.uid()))
WITH CHECK (public.is_admin_secure(auth.uid()));

-- Ensure the is_admin_secure function works correctly
CREATE OR REPLACE FUNCTION public.is_admin_secure(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.has_role(_user_id, 'admin'), false)
$$;
