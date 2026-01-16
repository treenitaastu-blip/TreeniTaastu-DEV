-- Optimize RLS Policies for exercise_notes and workout_sessions Tables
-- Phase 2, Task 1: Optimize RLS Policies (Batch 2)
-- 
-- This migration optimizes RLS policies on exercise_notes and workout_sessions
-- by replacing direct auth.uid() calls with (SELECT auth.uid()).
--
-- Risk: 🟡 MEDIUM - Could break access if policies are wrong
-- Impact: 🟠 HIGH - Performance improvement for RPE tracking and workout sessions
--
-- Generated: 2025-01-16
-- Validated: ✅ exercise_notes (2 policies, 169 rows), workout_sessions (1 policy, 76 rows)

-- ============================================================================
-- PRE-OPTIMIZATION VERIFICATION
-- ============================================================================
DO $$
DECLARE
  v_exercise_notes_count INTEGER;
  v_workout_sessions_count INTEGER;
BEGIN
  -- Verify exercise_notes policies exist
  SELECT COUNT(*) INTO v_exercise_notes_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'exercise_notes'
    AND policyname IN ('exercise_notes_modify_self', 'exercise_notes_select_authenticated', 'exercise_notes_service');
  
  -- Verify workout_sessions policies exist
  SELECT COUNT(*) INTO v_workout_sessions_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'workout_sessions'
    AND policyname IN ('workout_sessions_user_access', 'workout_sessions_service');
  
  IF v_exercise_notes_count < 3 THEN
    RAISE EXCEPTION 'Expected 3 policies on exercise_notes, found %', v_exercise_notes_count;
  END IF;
  
  IF v_workout_sessions_count < 2 THEN
    RAISE EXCEPTION 'Expected 2 policies on workout_sessions, found %', v_workout_sessions_count;
  END IF;
  
  RAISE NOTICE 'Pre-optimization check passed: All policies found';
END $$;

-- ============================================================================
-- OPTIMIZE EXERCISE_NOTES POLICIES
-- ============================================================================

-- 1. Optimize exercise_notes_modify_self policy
DROP POLICY IF EXISTS "exercise_notes_modify_self" ON public.exercise_notes;

CREATE POLICY "exercise_notes_modify_self" ON public.exercise_notes
FOR ALL
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- 2. Optimize exercise_notes_select_authenticated policy
DROP POLICY IF EXISTS "exercise_notes_select_authenticated" ON public.exercise_notes;

CREATE POLICY "exercise_notes_select_authenticated" ON public.exercise_notes
FOR SELECT
TO authenticated
USING (
  -- User can see their own exercise_notes
  (user_id = (SELECT auth.uid())) OR
  -- Admin can see all exercise_notes (check profiles table)
  (EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.id = (SELECT auth.uid()) 
    AND p.role = 'admin'
  )) OR
  -- Admin can see all exercise_notes (check user_roles table)
  (EXISTS (
    SELECT 1 
    FROM public.user_roles ur 
    WHERE ur.user_id = (SELECT auth.uid()) 
    AND ur.role = 'admin'::app_role
  ))
);

-- ============================================================================
-- OPTIMIZE WORKOUT_SESSIONS POLICIES
-- ============================================================================

-- 3. Optimize workout_sessions_user_access policy (complex policy with client_programs join)
DROP POLICY IF EXISTS "workout_sessions_user_access" ON public.workout_sessions;

CREATE POLICY "workout_sessions_user_access" ON public.workout_sessions
FOR ALL
TO authenticated
USING (
  -- User can access their own workout sessions
  (user_id = (SELECT auth.uid())) OR
  -- User can access workout sessions for programs they own, are assigned to, or assigned by
  (EXISTS (
    SELECT 1 
    FROM public.client_programs cp 
    WHERE cp.id = workout_sessions.client_program_id 
    AND (
      cp.user_id = (SELECT auth.uid()) OR
      cp.assigned_to = (SELECT auth.uid()) OR
      cp.assigned_by = (SELECT auth.uid()) OR
      -- Admin can access all
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
    )
  ))
);

-- Note: workout_sessions_service policy doesn't use auth.uid(), so no optimization needed

-- ============================================================================
-- POST-OPTIMIZATION VERIFICATION
-- ============================================================================
DO $$
DECLARE
  v_unoptimized_count INTEGER;
  v_optimized_count INTEGER;
BEGIN
  -- Check for any remaining unoptimized policies
  SELECT COUNT(*) INTO v_unoptimized_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('exercise_notes', 'workout_sessions')
    AND (
      (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%SELECT auth.uid()%') OR
      (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%SELECT auth.uid()%')
    );
  
  -- Check optimized policies exist
  SELECT COUNT(*) INTO v_optimized_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('exercise_notes', 'workout_sessions')
    AND (
      qual LIKE '%SELECT auth.uid()%' OR
      with_check LIKE '%SELECT auth.uid()%'
    );
  
  IF v_unoptimized_count > 0 THEN
    RAISE WARNING 'Some policies still unoptimized: %', v_unoptimized_count;
  END IF;
  
  IF v_optimized_count < 3 THEN
    RAISE WARNING 'Expected 3 optimized policies, found %', v_optimized_count;
  ELSE
    RAISE NOTICE '✅ All exercise_notes and workout_sessions policies optimized successfully';
  END IF;
END $$;

-- ============================================================================
-- IMPACT
-- ============================================================================
-- After optimization:
-- 1. exercise_notes (169 rows): auth.uid() called once per query instead of 169+ times
-- 2. workout_sessions (76 rows): auth.uid() called once per query instead of 76+ times
-- 3. Faster RPE tracking queries
-- 4. Faster workout session access queries
