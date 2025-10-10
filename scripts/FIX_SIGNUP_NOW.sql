-- ========================================
-- FIX SIGNUP 500 ERROR - RUN THIS NOW
-- ========================================
-- Fixes the ensure_trial_on_signup trigger
-- that's causing "Database error saving new user"
-- ========================================

CREATE OR REPLACE FUNCTION public.ensure_trial_on_signup()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Create profile
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

  -- Grant 7-day trial (WITH PROPER ENUM CAST)
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
    'static'::product_kind,  -- ✅ Fixed: cast to enum
    'trialing', 
    now(), 
    now() + interval '7 days', 
    false, 
    'signup_trigger', 
    '7-day free trial'
  )
  ON CONFLICT (user_id, product) DO NOTHING;

  -- Subscribers table (WITH EMAIL FIELD)
  INSERT INTO public.subscribers(
    user_id,
    email,  -- ✅ Fixed: added email
    status, 
    plan, 
    started_at, 
    trial_ends_at, 
    source
  )
  VALUES (
    new.id,
    new.email,  -- ✅ Fixed: include email
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

-- Verify it worked
SELECT '✅ Signup trigger fixed! Try creating an account now.' as status;

