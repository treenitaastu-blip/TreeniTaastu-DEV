-- Fix signup trigger to grant proper entitlements
-- This migration updates the signup flow to use user_entitlements system

-- Update the signup trigger function to grant 7-day static trial
CREATE OR REPLACE FUNCTION public.ensure_trial_on_signup()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Create profile with email and default role
  INSERT INTO public.profiles(id, email, created_at, role, full_name) 
  VALUES (
    new.id, 
    new.email, 
    now(), 
    'user',
    COALESCE(new.raw_user_meta_data->>'full_name', NULL)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

  -- Grant 7-day free trial for static program
  INSERT INTO public.user_entitlements(
    user_id, 
    product, 
    status, 
    started_at, 
    trial_ends_at, 
    paused, 
    source, 
    note
  )
  VALUES (
    new.id, 
    'static', 
    'trialing', 
    now(), 
    now() + interval '7 days', 
    false, 
    'signup_trigger', 
    '7-day free trial - auto-granted on signup'
  )
  ON CONFLICT (user_id, product) DO NOTHING;

  -- Also maintain legacy subscribers table for backward compatibility
  INSERT INTO public.subscribers(
    user_id, 
    status, 
    plan, 
    started_at, 
    trial_ends_at, 
    source
  )
  VALUES (
    new.id, 
    'trialing', 
    'basic', 
    now(), 
    now() + interval '7 days', 
    'signup_trigger'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN new;
END;
$$;

-- Trigger is already created, this just updates the function
-- The existing trigger will automatically use the new function definition

-- Add comment for documentation
COMMENT ON FUNCTION public.ensure_trial_on_signup() IS 
'Automatically grants 7-day static program trial when user signs up. Also creates profile and maintains subscribers table for backward compatibility.';



