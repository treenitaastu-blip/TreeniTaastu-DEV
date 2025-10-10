-- =====================================================
-- DIAGNOSTIC SQL - Run this to find the root cause
-- =====================================================

-- 1. Check if user_entitlements table exists
SELECT 
  EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'user_entitlements'
  ) as user_entitlements_exists;

-- 2. Check all columns in profiles table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check if user_entitlements table exists and its columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_entitlements' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check current signup trigger function
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'ensure_trial_on_signup';

-- 5. Check if product_kind enum exists
SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_kind') as product_kind_exists;



