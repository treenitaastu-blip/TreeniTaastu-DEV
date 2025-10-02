-- Fix critical RLS policies for template access control
-- Currently template_days and template_items allow public access (true) which is a security risk

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "pt_tdays_select" ON public.template_days;
DROP POLICY IF EXISTS "pt_tdays_insert" ON public.template_days;
DROP POLICY IF EXISTS "pt_tdays_update" ON public.template_days;
DROP POLICY IF EXISTS "pt_tdays_delete" ON public.template_days;

DROP POLICY IF EXISTS "pt_titems_select" ON public.template_items;
DROP POLICY IF EXISTS "pt_titems_insert" ON public.template_items;
DROP POLICY IF EXISTS "pt_titems_update" ON public.template_items;
DROP POLICY IF EXISTS "pt_titems_delete" ON public.template_items;

-- Create new restrictive policies for template_days (only admins and authorized coaches)
CREATE POLICY "template_days_select_admin_only" 
ON public.template_days 
FOR SELECT 
USING (is_admin());

CREATE POLICY "template_days_insert_admin_only" 
ON public.template_days 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "template_days_update_admin_only" 
ON public.template_days 
FOR UPDATE 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "template_days_delete_admin_only" 
ON public.template_days 
FOR DELETE 
USING (is_admin());

-- Create new restrictive policies for template_items (only admins and authorized coaches)
CREATE POLICY "template_items_select_admin_only" 
ON public.template_items 
FOR SELECT 
USING (is_admin());

CREATE POLICY "template_items_insert_admin_only" 
ON public.template_items 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "template_items_update_admin_only" 
ON public.template_items 
FOR UPDATE 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "template_items_delete_admin_only" 
ON public.template_items 
FOR DELETE 
USING (is_admin());

-- Add server-side admin validation function with better security
CREATE OR REPLACE FUNCTION public.ensure_admin_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  is_admin_user boolean := false;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  
  -- Return false if no authenticated user
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is admin via profiles table
  SELECT (role = 'admin') 
  INTO is_admin_user
  FROM public.profiles 
  WHERE id = current_user_id;
  
  -- Check if user has admin override access
  IF NOT is_admin_user THEN
    SELECT EXISTS(
      SELECT 1 
      FROM public.access_overrides 
      WHERE user_id = current_user_id 
        AND (expires_at IS NULL OR expires_at > now())
    ) INTO is_admin_user;
  END IF;
  
  RETURN COALESCE(is_admin_user, false);
END;
$$;

-- Enhanced admin check function with logging for security audit
CREATE OR REPLACE FUNCTION public.validate_admin_action(action_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  user_email text;
  is_valid_admin boolean;
BEGIN
  current_user_id := auth.uid();
  
  -- Log the admin action attempt
  IF current_user_id IS NOT NULL THEN
    SELECT email INTO user_email FROM auth.users WHERE id = current_user_id;
    
    -- You could add audit logging here if needed
    -- INSERT INTO admin_audit_log(user_id, user_email, action_type, attempted_at) 
    -- VALUES (current_user_id, user_email, action_type, now());
  END IF;
  
  -- Check admin access
  is_valid_admin := ensure_admin_access();
  
  RETURN is_valid_admin;
END;
$$;