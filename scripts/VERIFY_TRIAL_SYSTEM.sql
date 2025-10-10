-- ========================================
-- VERIFY TRIAL SYSTEM IS WORKING
-- ========================================
-- Run this to check if everything is configured correctly
-- ========================================

-- 1. Check signup trigger exists and is correct
SELECT 
  'Signup Trigger' as component,
  CASE 
    WHEN routine_definition LIKE '%::product_kind%' 
    AND routine_definition LIKE '%interval ''7 days''%'
    AND routine_definition LIKE '%new.email%'
    THEN '✅ CORRECT (7-day trial, enum cast, email field)'
    ELSE '❌ NEEDS FIX'
  END as status
FROM information_schema.routines 
WHERE routine_name = 'ensure_trial_on_signup'
AND routine_schema = 'public'

UNION ALL

-- 2. Check user_entitlements table exists
SELECT 
  'user_entitlements table' as component,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'user_entitlements' 
      AND table_schema = 'public'
    )
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status

UNION ALL

-- 3. Check replica identity for realtime
SELECT 
  'Realtime filters' as component,
  CASE c.relreplident
    WHEN 'f' THEN '✅ FULL (can filter)'
    ELSE '❌ NOT FULL'
  END as status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'user_entitlements'
AND n.nspname = 'public'

UNION ALL

-- 4. Check if tables are in realtime publication
SELECT 
  'Realtime publication' as component,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ All tables added'
    ELSE '❌ Missing tables'
  END as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('support_conversations', 'support_messages', 'user_entitlements', 'profiles');

-- ========================================
-- Current Active Trials
-- ========================================

SELECT 
  '--- ACTIVE TRIALS ---' as info,
  '' as value;

SELECT 
  au.email,
  ue.product,
  ue.status,
  ue.trial_ends_at,
  EXTRACT(DAY FROM (ue.trial_ends_at - now())) as days_remaining,
  CASE 
    WHEN ue.trial_ends_at > now() THEN '✅ Active'
    WHEN ue.trial_ends_at + interval '48 hours' > now() THEN '⏰ Grace Period'
    ELSE '❌ Expired'
  END as trial_status
FROM user_entitlements ue
JOIN auth.users au ON au.id = ue.user_id
WHERE ue.status = 'trialing'
ORDER BY ue.trial_ends_at ASC;

-- ========================================
-- Test Trial Status for Current User
-- ========================================

SELECT 
  '--- YOUR TRIAL STATUS ---' as info,
  '' as value;

SELECT 
  ue.product,
  ue.status,
  ue.trial_ends_at,
  ue.trial_ends_at > now() as is_active,
  ue.trial_ends_at + interval '48 hours' > now() as in_grace_period,
  CASE 
    WHEN ue.trial_ends_at > now() 
    THEN CONCAT(EXTRACT(DAY FROM (ue.trial_ends_at - now())), ' days remaining')
    WHEN ue.trial_ends_at + interval '48 hours' > now()
    THEN CONCAT(ROUND(EXTRACT(EPOCH FROM (ue.trial_ends_at + interval '48 hours' - now())) / 3600), 'h grace period')
    ELSE 'Expired'
  END as status_message
FROM user_entitlements ue
WHERE ue.user_id = auth.uid()
AND ue.status = 'trialing';

-- ========================================
-- Success Message
-- ========================================

SELECT '🎉 Trial system verification complete!' as final_status;

