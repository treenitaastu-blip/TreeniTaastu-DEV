-- Optimize RLS Policies for set_logs Table
-- Phase 2, Task 1: Optimize RLS Policies (Critical for "Mark as Done")
-- 
-- This migration optimizes RLS policies on the set_logs table by replacing
-- direct auth.uid() calls with (SELECT auth.uid()) to prevent calling
-- the function once per row.
--
-- Risk: 🟡 MEDIUM - Could break access if policies are wrong
-- Impact: 🟠 HIGH - Could fix "mark exercise as done" timeout issue
--
-- Generated: 2025-01-16
-- Validated: ✅ 2 policies identified for optimization

-- ============================================================================
-- PRE-OPTIMIZATION VERIFICATION
-- ============================================================================
-- Verify policies exist before modifying
DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'set_logs'
    AND policyname IN ('set_logs_modify_self', 'set_logs_select_authenticated', 'set_logs_service');
  
  IF v_policy_count < 3 THEN
    RAISE EXCEPTION 'Expected 3 policies on set_logs, found %', v_policy_count;
  END IF;
  
  RAISE NOTICE 'Pre-optimization check passed: All 3 policies found';
END $$;

-- ============================================================================
-- OPTIMIZE RLS POLICIES
-- ============================================================================

-- 1. Optimize set_logs_modify_self policy
-- Current: user_id = auth.uid() (called once per row)
-- Optimized: user_id = (SELECT auth.uid()) (called once per query)
-- This policy controls INSERT, UPDATE, DELETE operations
DROP POLICY IF EXISTS "set_logs_modify_self" ON public.set_logs;

CREATE POLICY "set_logs_modify_self" ON public.set_logs
FOR ALL
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- 2. Optimize set_logs_select_authenticated policy
-- Current: Multiple auth.uid() calls (called once per row, multiple times)
-- Optimized: (SELECT auth.uid()) (called once per query, reused)
-- This policy controls SELECT operations with admin override
DROP POLICY IF EXISTS "set_logs_select_authenticated" ON public.set_logs;

CREATE POLICY "set_logs_select_authenticated" ON public.set_logs
FOR SELECT
TO authenticated
USING (
  -- User can see their own set_logs
  (user_id = (SELECT auth.uid())) OR
  -- Admin can see all set_logs (check profiles table)
  (EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.id = (SELECT auth.uid()) 
    AND p.role = 'admin'
  )) OR
  -- Admin can see all set_logs (check user_roles table)
  (EXISTS (
    SELECT 1 
    FROM public.user_roles ur 
    WHERE ur.user_id = (SELECT auth.uid()) 
    AND ur.role = 'admin'::app_role
  ))
);

-- Note: set_logs_service policy doesn't use auth.uid(), so no optimization needed
-- It remains unchanged:
-- CREATE POLICY "set_logs_service" ON public.set_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- POST-OPTIMIZATION VERIFICATION
-- ============================================================================
-- Verify policies were optimized correctly
DO $$
DECLARE
  v_unoptimized_count INTEGER;
  v_optimized_count INTEGER;
BEGIN
  -- Check for any remaining unoptimized policies on set_logs
  SELECT COUNT(*) INTO v_unoptimized_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'set_logs'
    AND (
      (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%') OR
      (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
    );
  
  -- Check optimized policies exist
  SELECT COUNT(*) INTO v_optimized_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'set_logs'
    AND (
      qual LIKE '%(SELECT auth.uid())%' OR
      with_check LIKE '%(SELECT auth.uid())%'
    );
  
  IF v_unoptimized_count > 0 THEN
    RAISE WARNING 'Some policies still unoptimized: %', v_unoptimized_count;
  END IF;
  
  IF v_optimized_count < 2 THEN
    RAISE WARNING 'Expected 2 optimized policies, found %', v_optimized_count;
  ELSE
    RAISE NOTICE '✅ All set_logs policies optimized successfully';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- After running this migration, verify policies:
--
-- SELECT 
--   policyname,
--   cmd,
--   CASE 
--     WHEN qual LIKE '%(SELECT auth.uid())%' OR with_check LIKE '%(SELECT auth.uid())%' THEN '✅ OPTIMIZED'
--     WHEN qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%' THEN '❌ UNOPTIMIZED'
--     ELSE 'N/A'
--   END as optimization_status
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename = 'set_logs'
-- ORDER BY policyname;
--
-- Expected: All policies using auth.uid() should show "✅ OPTIMIZED"

-- ============================================================================
-- IMPACT
-- ============================================================================
-- After optimization:
-- 1. auth.uid() called once per query instead of once per row
-- 2. For 570 rows in set_logs, this reduces function calls from 570+ to 1 per query
-- 3. Should significantly improve "mark exercise as done" performance
-- 4. Faster SELECT queries for users viewing their workout history
-- 5. Faster INSERT/UPDATE/DELETE operations

-- ============================================================================
-- TESTING CHECKLIST
-- ============================================================================
-- After applying this migration:
-- [ ] Test "mark exercise as done" functionality - CRITICAL
-- [ ] Test user can view their own set_logs
-- [ ] Test user cannot view other users' set_logs
-- [ ] Test admin can view all set_logs
-- [ ] Test user can INSERT their own set_logs
-- [ ] Test user can UPDATE their own set_logs
-- [ ] Test user can DELETE their own set_logs
-- [ ] Test user cannot modify other users' set_logs
-- [ ] Verify no errors in logs

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- If you need to rollback to unoptimized policies:
--
-- -- Rollback set_logs_modify_self
-- DROP POLICY IF EXISTS "set_logs_modify_self" ON public.set_logs;
-- CREATE POLICY "set_logs_modify_self" ON public.set_logs
-- FOR ALL
-- TO authenticated
-- USING (user_id = auth.uid())
-- WITH CHECK (user_id = auth.uid());
--
-- -- Rollback set_logs_select_authenticated
-- DROP POLICY IF EXISTS "set_logs_select_authenticated" ON public.set_logs;
-- CREATE POLICY "set_logs_select_authenticated" ON public.set_logs
-- FOR SELECT
-- TO authenticated
-- USING (
--   (user_id = auth.uid()) OR
--   (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')) OR
--   (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role))
-- );
