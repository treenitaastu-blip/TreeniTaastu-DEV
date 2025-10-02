-- Phase 1: Fix Critical Profile Role Privilege Escalation Vulnerability
-- Create user_roles table for proper role management

-- Create role enum (check if exists first)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
    END IF;
END$$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    granted_by uuid REFERENCES auth.users(id),
    granted_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is admin using new system
CREATE OR REPLACE FUNCTION public.is_admin_secure(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.has_role(_user_id, 'admin'), false)
$$;

-- Migrate existing admin users from profiles table to user_roles
INSERT INTO public.user_roles (user_id, role, granted_at)
SELECT id, 'admin'::app_role, created_at
FROM public.profiles 
WHERE role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;

-- Create RLS policies for user_roles table
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated  
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Remove role update capability from profiles table completely
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_no_role" ON public.profiles;

-- Create restricted policy that excludes role column updates
CREATE POLICY "profiles_update_own_no_role"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Add trigger to prevent role changes on profiles table
CREATE OR REPLACE FUNCTION public.prevent_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent any changes to the role column
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    RAISE EXCEPTION 'Role changes not allowed. Use user_roles table instead.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_role_changes ON public.profiles;
CREATE TRIGGER prevent_profile_role_changes
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_changes();

-- Update trigger for user_roles
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

DROP TRIGGER IF EXISTS update_user_roles_updated_at ON public.user_roles;
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_user_roles();

-- Update is_admin function to use new secure system
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT public.is_admin_secure(auth.uid())
$$;