-- Fix remaining security issues from linter

-- Fix functions missing SET search_path
CREATE OR REPLACE FUNCTION public.ensure_admin_access()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  is_admin_user boolean := false;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check using new secure admin function
  is_admin_user := public.is_admin_secure(current_user_id);
  
  -- Also check access overrides as fallback
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
  
  IF current_user_id IS NOT NULL THEN
    SELECT email INTO user_email FROM auth.users WHERE id = current_user_id;
    
    -- Enhanced audit logging
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_audit_log') THEN
      INSERT INTO admin_audit_log(user_id, user_email, action_type, attempted_at) 
      VALUES (current_user_id, user_email, action_type, now());
    END IF;
  END IF;
  
  is_valid_admin := public.ensure_admin_access();
  
  RETURN is_valid_admin;
END;
$$;