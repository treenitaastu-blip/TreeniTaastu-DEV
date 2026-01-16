-- Enable RLS on Tables (motivational_quotes and volume_progression)
-- Phase 2, Task 2: Enable RLS on Tables
-- 
-- This migration enables RLS on motivational_quotes and volume_progression tables
-- and creates appropriate policies for authenticated access.
--
-- Risk: 🟡 MEDIUM - Could break RPC functions if policies are wrong
-- Impact: 🟡 MEDIUM - Security improvement
--
-- Generated: 2025-01-16
-- Validated: ✅ motivational_quotes (20 rows), volume_progression (39 rows)

-- ============================================================================
-- PRE-ENABLE VERIFICATION
-- ============================================================================
DO $$
DECLARE
  v_motivational_quotes_rls BOOLEAN;
  v_volume_progression_rls BOOLEAN;
BEGIN
  -- Check current RLS status
  SELECT rowsecurity INTO v_motivational_quotes_rls
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'motivational_quotes';
  
  SELECT rowsecurity INTO v_volume_progression_rls
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'volume_progression';
  
  IF v_motivational_quotes_rls THEN
    RAISE NOTICE 'RLS already enabled on motivational_quotes';
  END IF;
  
  IF v_volume_progression_rls THEN
    RAISE NOTICE 'RLS already enabled on volume_progression';
  END IF;
  
  RAISE NOTICE 'Pre-enable check completed';
END $$;

-- ============================================================================
-- ENABLE RLS ON TABLES
-- ============================================================================

-- Enable RLS on motivational_quotes
ALTER TABLE public.motivational_quotes ENABLE ROW LEVEL SECURITY;

-- Enable RLS on volume_progression
ALTER TABLE public.volume_progression ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE POLICIES FOR MOTIVATIONAL_QUOTES
-- ============================================================================

-- Policy: All authenticated users can read motivational quotes
-- This is read-only public data, no user_id needed
CREATE POLICY "motivational_quotes_select_authenticated" ON public.motivational_quotes
FOR SELECT
TO authenticated
USING (true);

-- Note: No INSERT/UPDATE/DELETE policies needed - only admins should modify quotes
-- Admins can use service_role or bypass RLS with proper permissions

-- ============================================================================
-- CREATE POLICIES FOR VOLUME_PROGRESSION
-- ============================================================================

-- Policy: Users can view their own volume progression entries
CREATE POLICY "volume_progression_select_own" ON public.volume_progression
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Policy: Users can insert their own volume progression entries
CREATE POLICY "volume_progression_insert_own" ON public.volume_progression
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

-- Policy: Users can update their own volume progression entries
CREATE POLICY "volume_progression_update_own" ON public.volume_progression
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- Policy: Admins can view all volume progression entries
CREATE POLICY "volume_progression_select_admin" ON public.volume_progression
FOR SELECT
TO authenticated
USING (
  (EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.id = (SELECT auth.uid()) 
    AND p.role = 'admin'
  )) OR
  (EXISTS (
    SELECT 1 
    FROM public.user_roles ur 
    WHERE ur.user_id = (SELECT auth.uid()) 
    AND ur.role = 'admin'::app_role
  ))
);

-- ============================================================================
-- POST-ENABLE VERIFICATION
-- ============================================================================
DO $$
DECLARE
  v_motivational_quotes_rls BOOLEAN;
  v_volume_progression_rls BOOLEAN;
  v_motivational_quotes_policies INTEGER;
  v_volume_progression_policies INTEGER;
BEGIN
  -- Verify RLS is enabled
  SELECT rowsecurity INTO v_motivational_quotes_rls
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'motivational_quotes';
  
  SELECT rowsecurity INTO v_volume_progression_rls
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'volume_progression';
  
  -- Count policies
  SELECT COUNT(*) INTO v_motivational_quotes_policies
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'motivational_quotes';
  
  SELECT COUNT(*) INTO v_volume_progression_policies
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'volume_progression';
  
  IF NOT v_motivational_quotes_rls THEN
    RAISE WARNING 'RLS not enabled on motivational_quotes';
  END IF;
  
  IF NOT v_volume_progression_rls THEN
    RAISE WARNING 'RLS not enabled on volume_progression';
  END IF;
  
  IF v_motivational_quotes_policies < 1 THEN
    RAISE WARNING 'No policies found on motivational_quotes';
  END IF;
  
  IF v_volume_progression_policies < 4 THEN
    RAISE WARNING 'Expected 4 policies on volume_progression, found %', v_volume_progression_policies;
  END IF;
  
  IF v_motivational_quotes_rls AND v_volume_progression_rls AND v_motivational_quotes_policies >= 1 AND v_volume_progression_policies >= 4 THEN
    RAISE NOTICE '✅ RLS enabled successfully on both tables with proper policies';
  END IF;
END $$;

-- ============================================================================
-- TESTING CHECKLIST
-- ============================================================================
-- After applying this migration:
-- [ ] Test get_random_motivational_quote() RPC - should still work
-- [ ] Test apply_volume_progression() RPC - should still work
-- [ ] Test user can read their own volume_progression entries
-- [ ] Test user cannot read other users' volume_progression entries
-- [ ] Test user can insert their own volume_progression entries
-- [ ] Test user can update their own volume_progression entries
-- [ ] Test admin can view all volume_progression entries
-- [ ] Verify no errors in logs

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- If you need to rollback:
--
-- -- Disable RLS
-- ALTER TABLE public.motivational_quotes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.volume_progression DISABLE ROW LEVEL SECURITY;
--
-- -- Drop policies
-- DROP POLICY IF EXISTS "motivational_quotes_select_authenticated" ON public.motivational_quotes;
-- DROP POLICY IF EXISTS "volume_progression_select_own" ON public.volume_progression;
-- DROP POLICY IF EXISTS "volume_progression_insert_own" ON public.volume_progression;
-- DROP POLICY IF EXISTS "volume_progression_update_own" ON public.volume_progression;
-- DROP POLICY IF EXISTS "volume_progression_select_admin" ON public.volume_progression;
