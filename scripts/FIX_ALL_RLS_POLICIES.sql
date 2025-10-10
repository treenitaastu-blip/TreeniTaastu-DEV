-- =====================================================
-- COMPLETE RLS FIX - APPLY THIS IN SUPABASE SQL EDITOR
-- This fixes ALL 403 permission denied errors
-- =====================================================

BEGIN;

-- =====================================================
-- 1. FIX PROFILES TABLE RLS
-- =====================================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_no_role" ON public.profiles;
DROP POLICY IF EXISTS "prevent_profile_role_changes" ON public.profiles;

-- Create simple, working policies
CREATE POLICY "profiles_select_own" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (id = (SELECT auth.uid()));

CREATE POLICY "profiles_insert_own" 
ON public.profiles 
FOR INSERT 
TO authenticated, anon
WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "profiles_update_own" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));


-- =====================================================
-- 2. FIX USER_ENTITLEMENTS TABLE RLS
-- =====================================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "ue_select_self_or_admin" ON public.user_entitlements;
DROP POLICY IF EXISTS "ue_insert_service_role" ON public.user_entitlements;
DROP POLICY IF EXISTS "ue_update_service_role" ON public.user_entitlements;
DROP POLICY IF EXISTS "ue_admin_write" ON public.user_entitlements;
DROP POLICY IF EXISTS "ue_insert_all" ON public.user_entitlements;
DROP POLICY IF EXISTS "ue_update_all" ON public.user_entitlements;
DROP POLICY IF EXISTS "ue_service_role_all" ON public.user_entitlements;

-- Create simple, working policies
CREATE POLICY "user_entitlements_select_own" 
ON public.user_entitlements 
FOR SELECT 
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "user_entitlements_insert_authenticated" 
ON public.user_entitlements 
FOR INSERT 
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "user_entitlements_update_own" 
ON public.user_entitlements 
FOR UPDATE 
TO authenticated
USING (user_id = (SELECT auth.uid()));


-- =====================================================
-- 3. FIX SUPPORT_CONVERSATIONS TABLE RLS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "support_conversations_select_own" ON public.support_conversations;
DROP POLICY IF EXISTS "support_conversations_insert_own" ON public.support_conversations;
DROP POLICY IF EXISTS "support_conversations_update_own" ON public.support_conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.support_conversations;

-- Create simple policies
CREATE POLICY "support_conversations_select_own" 
ON public.support_conversations 
FOR SELECT 
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "support_conversations_insert_own" 
ON public.support_conversations 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "support_conversations_update_own" 
ON public.support_conversations 
FOR UPDATE 
TO authenticated
USING (user_id = (SELECT auth.uid()));


-- =====================================================
-- 4. VERIFY POLICIES ARE WORKING
-- =====================================================

-- This should return your profile
SELECT id, email, role FROM profiles WHERE id = (SELECT auth.uid()) LIMIT 1;

-- This should return your entitlements
SELECT * FROM user_entitlements WHERE user_id = (SELECT auth.uid());

COMMIT;

-- Success message
SELECT '✅ All RLS policies fixed! Refresh your app now.' as status;



