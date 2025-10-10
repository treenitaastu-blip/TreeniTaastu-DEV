-- ========================================
-- COMPLETE SIGNUP FIX - Apply Both Fixes
-- ========================================
-- 1. Fixes signup trigger (enum cast + email)
-- 2. Fixes realtime subscriptions (replica identity)
-- ========================================

-- ====================
-- FIX 1: Signup Trigger
-- ====================

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
    user_id, product, status, started_at, trial_ends_at, paused, source, note
  )
  VALUES (
    new.id, 
    'static'::product_kind,  -- ✅ Cast to enum
    'trialing', 
    now(), 
    now() + interval '7 days', 
    false, 
    'signup_trigger', 
    '7-day free trial'
  )
  ON CONFLICT (user_id, product) DO NOTHING;

  -- Subscribers table (WITH EMAIL)
  INSERT INTO public.subscribers(user_id, email, status, plan, started_at, trial_ends_at, source)
  VALUES (
    new.id,
    new.email,  -- ✅ Include email
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

-- ====================
-- FIX 2: Realtime Filters
-- ====================

-- Enable full replica identity for realtime filtering
ALTER TABLE public.support_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;

-- Also fix other tables that might have the same issue
ALTER TABLE public.user_entitlements REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- ====================
-- Verification
-- ====================

-- Check trigger fix
SELECT 
  'Trigger: ' || routine_name as check_item,
  CASE 
    WHEN routine_definition LIKE '%::product_kind%' 
    AND routine_definition LIKE '%new.email%' 
    THEN '✅ Fixed'
    ELSE '❌ Not Fixed'
  END as status
FROM information_schema.routines 
WHERE routine_name = 'ensure_trial_on_signup'
AND routine_schema = 'public'

UNION ALL

-- Check realtime setup
SELECT 
  'Realtime: ' || tablename as check_item,
  CASE relreplident
    WHEN 'f' THEN '✅ FULL (can filter)'
    WHEN 'd' THEN '⚠️ DEFAULT (primary key only)'
    ELSE '❌ Not configured'
  END as status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'support_conversations'
AND n.nspname = 'public';

-- Final message
SELECT '🎉 Both fixes applied! Try signup now.' as final_status;

