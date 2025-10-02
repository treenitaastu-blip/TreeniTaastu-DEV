-- CRITICAL SECURITY FIX: Secure subscribers table from data theft
-- Issue: Duplicate RLS policies and potential public access to customer emails and Stripe IDs

-- First, drop all existing policies to start clean
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "subs_admin_write" ON public.subscribers;
DROP POLICY IF EXISTS "subs_select_self" ON public.subscribers;

-- Ensure RLS is enabled (should already be, but being explicit)
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Create secure SELECT policy - users can only see their own subscription data
CREATE POLICY "subscribers_select_own_only" 
ON public.subscribers 
FOR SELECT 
USING (user_id = auth.uid());

-- Create secure admin SELECT policy for admin access
CREATE POLICY "subscribers_select_admin_only" 
ON public.subscribers 
FOR SELECT 
USING (is_admin());

-- Admin can insert/update/delete (for subscription management)
CREATE POLICY "subscribers_insert_admin_only" 
ON public.subscribers 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "subscribers_update_admin_only" 
ON public.subscribers 
FOR UPDATE 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "subscribers_delete_admin_only" 
ON public.subscribers 
FOR DELETE 
USING (is_admin());

-- Create secure function to check subscription status without exposing sensitive data
CREATE OR REPLACE FUNCTION public.get_user_subscription_status(check_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  subscription_info jsonb;
BEGIN
  current_user_id := auth.uid();
  
  -- Security check: users can only check their own status unless they're admin
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;
  
  IF check_user_id != current_user_id AND NOT is_admin() THEN
    RETURN jsonb_build_object('error', 'Access denied');
  END IF;
  
  -- Return only non-sensitive subscription information
  SELECT jsonb_build_object(
    'subscribed', subscribed,
    'status', status,
    'subscription_tier', subscription_tier,
    'trial_ends_at', trial_ends_at,
    'expires_at', expires_at,
    'paused', paused,
    'plan', plan
  )
  INTO subscription_info
  FROM public.subscribers
  WHERE user_id = check_user_id;
  
  RETURN COALESCE(subscription_info, jsonb_build_object('subscribed', false));
END;
$$;

-- Create audit log function for sensitive data access (optional, can be enabled later)
CREATE OR REPLACE FUNCTION public.audit_subscriber_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log access to sensitive subscriber data for security monitoring
  -- This is disabled by default but can be enabled by creating the audit table
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_audit_log') THEN
    INSERT INTO security_audit_log (
      user_id, 
      action, 
      table_name, 
      accessed_user_id, 
      timestamp,
      ip_address
    ) VALUES (
      auth.uid(),
      TG_OP,
      'subscribers',
      CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN NEW.user_id ELSE OLD.user_id END,
      now(),
      current_setting('request.header.x-forwarded-for', true)
    );
  END IF;
  
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- Security enhancement: Create view that masks sensitive data for non-admin access
CREATE OR REPLACE VIEW public.v_safe_subscribers AS
SELECT 
  id,
  user_id,
  -- Mask email for non-admins
  CASE 
    WHEN is_admin() THEN email 
    ELSE CONCAT(LEFT(email, 3), '***@', SPLIT_PART(email, '@', 2))
  END as email,
  -- Hide Stripe customer ID for non-admins
  CASE 
    WHEN is_admin() THEN stripe_customer_id 
    ELSE NULL 
  END as stripe_customer_id,
  subscribed,
  subscription_tier,
  subscription_end,
  status,
  plan,
  trial_ends_at,
  expires_at,
  paused,
  created_at,
  updated_at
FROM public.subscribers
WHERE user_id = auth.uid() OR is_admin();

-- Grant appropriate permissions on the view
GRANT SELECT ON public.v_safe_subscribers TO authenticated;
REVOKE ALL ON public.v_safe_subscribers FROM anon, public;

-- Add comment documenting the security measures
COMMENT ON TABLE public.subscribers IS 'SENSITIVE DATA: Contains customer emails and Stripe IDs. Access restricted to user''s own data only. Use v_safe_subscribers view for safer access.';

COMMENT ON VIEW public.v_safe_subscribers IS 'Secure view of subscribers table that masks sensitive data for non-admin users. Preferred for most application use cases.';