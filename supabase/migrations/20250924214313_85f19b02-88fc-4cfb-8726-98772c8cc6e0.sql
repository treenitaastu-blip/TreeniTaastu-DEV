-- Fix Security Definer View issue by replacing view with SECURITY INVOKER approach
-- The previous view was flagged as using SECURITY DEFINER which can bypass RLS

-- Drop the problematic view
DROP VIEW IF EXISTS public.v_safe_subscribers;

-- Create a secure function instead of a view to avoid SECURITY DEFINER issues
CREATE OR REPLACE FUNCTION public.get_safe_subscriber_info(target_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(
  id uuid,
  user_id uuid,
  email_masked text,
  subscription_tier text,
  subscription_end timestamptz,
  status text,
  plan text,
  trial_ends_at timestamptz,
  expires_at timestamptz,
  paused boolean,
  subscribed boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER  -- Use SECURITY INVOKER instead of DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  is_user_admin boolean;
BEGIN
  current_user_id := auth.uid();
  
  -- Check if current user is admin
  is_user_admin := is_admin();
  
  -- Security check: users can only see their own data unless admin
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;
  
  IF target_user_id != current_user_id AND NOT is_user_admin THEN
    RETURN;
  END IF;
  
  -- Return data with appropriate masking
  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    -- Mask email for non-admins
    CASE 
      WHEN is_user_admin THEN s.email 
      ELSE CONCAT(LEFT(s.email, 3), '***@', SPLIT_PART(s.email, '@', 2))
    END as email_masked,
    s.subscription_tier,
    s.subscription_end,
    s.status,
    s.plan,
    s.trial_ends_at,
    s.expires_at,
    s.paused,
    s.subscribed,
    s.created_at,
    s.updated_at
  FROM public.subscribers s
  WHERE s.user_id = target_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_safe_subscriber_info(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_safe_subscriber_info(uuid) FROM anon, public;

-- Add documentation
COMMENT ON FUNCTION public.get_safe_subscriber_info(uuid) IS 'Secure function to retrieve subscriber information with data masking for non-admin users. Uses SECURITY INVOKER to respect RLS policies.';