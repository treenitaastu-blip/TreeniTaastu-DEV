-- Optimize RLS Policies - Batch 3 (Remaining Tables)
-- Phase 2, Task 1: Optimize RLS Policies (Batch 3)
-- 
-- This migration optimizes remaining RLS policies across multiple tables
-- by replacing direct auth.uid() calls with (SELECT auth.uid()).
--
-- Risk: 🟡 MEDIUM - Could break access if policies are wrong
-- Impact: 🟠 HIGH - Performance improvement across all tables
--
-- Generated: 2025-01-16

-- ============================================================================
-- OPTIMIZE ACCESS_OVERRIDES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "access_overrides_user_select" ON public.access_overrides;
CREATE POLICY "access_overrides_user_select" ON public.access_overrides
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- OPTIMIZE BOOKING_REQUESTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can create their own bookings" ON public.booking_requests;
CREATE POLICY "Users can create their own bookings" ON public.booking_requests
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own bookings" ON public.booking_requests;
CREATE POLICY "Users can update their own bookings" ON public.booking_requests
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their own bookings" ON public.booking_requests;
CREATE POLICY "Users can view their own bookings" ON public.booking_requests
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- OPTIMIZE CLIENT_DAYS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "client_days_admin_access" ON public.client_days;
CREATE POLICY "client_days_admin_access" ON public.client_days
FOR ALL
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
)
WITH CHECK (
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

DROP POLICY IF EXISTS "client_days_user_all" ON public.client_days;
CREATE POLICY "client_days_user_all" ON public.client_days
FOR ALL
TO authenticated
USING (
  (user_id = (SELECT auth.uid())) OR
  (EXISTS (
    SELECT 1 
    FROM public.client_programs
    WHERE client_programs.id = client_days.client_program_id 
    AND (
      client_programs.assigned_to = (SELECT auth.uid()) OR
      client_programs.user_id = (SELECT auth.uid()) OR
      client_programs.assigned_by = (SELECT auth.uid())
    )
  ))
);

-- ============================================================================
-- OPTIMIZE CLIENT_ITEMS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "client_items_user_access" ON public.client_items;
CREATE POLICY "client_items_user_access" ON public.client_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.client_days cd
    JOIN public.client_programs cp ON cp.id = cd.client_program_id
    WHERE cd.id = client_items.client_day_id 
    AND (
      cp.user_id = (SELECT auth.uid()) OR
      cp.assigned_to = (SELECT auth.uid()) OR
      cp.assigned_by = (SELECT auth.uid()) OR
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
  )
);

-- ============================================================================
-- OPTIMIZE CLIENT_PROGRAMS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "client_programs_user_access" ON public.client_programs;
CREATE POLICY "client_programs_user_access" ON public.client_programs
FOR ALL
TO authenticated
USING (
  (user_id = (SELECT auth.uid())) OR
  (assigned_to = (SELECT auth.uid())) OR
  (assigned_by = (SELECT auth.uid())) OR
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
-- OPTIMIZE ERROR_LOGS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can update error logs" ON public.error_logs;
CREATE POLICY "Admins can update error logs" ON public.error_logs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid()) 
    AND user_roles.role = 'admin'::app_role
  )
);

DROP POLICY IF EXISTS "Admins can view all error logs" ON public.error_logs;
CREATE POLICY "Admins can view all error logs" ON public.error_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid()) 
    AND user_roles.role = 'admin'::app_role
  )
);

-- ============================================================================
-- OPTIMIZE PAYMENTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments" ON public.payments
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- OPTIMIZE PROGRESSION_ANALYSIS_FAILURES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can update progression analysis failures" ON public.progression_analysis_failures;
CREATE POLICY "Admins can update progression analysis failures" ON public.progression_analysis_failures
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid()) 
    AND user_roles.role = 'admin'::app_role
  )
);

DROP POLICY IF EXISTS "Admins can view all progression analysis failures" ON public.progression_analysis_failures;
CREATE POLICY "Admins can view all progression analysis failures" ON public.progression_analysis_failures
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid()) 
    AND user_roles.role = 'admin'::app_role
  )
);

-- ============================================================================
-- OPTIMIZE SUPPORT_CONVERSATIONS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "support_conversations_user_all" ON public.support_conversations;
CREATE POLICY "support_conversations_user_all" ON public.support_conversations
FOR ALL
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================================
-- OPTIMIZE SUPPORT_MESSAGES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "support_messages_user_insert" ON public.support_messages;
CREATE POLICY "support_messages_user_insert" ON public.support_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.support_conversations
    WHERE support_conversations.id = support_messages.conversation_id 
    AND support_conversations.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "support_messages_user_view" ON public.support_messages;
CREATE POLICY "support_messages_user_view" ON public.support_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.support_conversations
    WHERE support_conversations.id = support_messages.conversation_id 
    AND support_conversations.user_id = (SELECT auth.uid())
  )
);

-- ============================================================================
-- OPTIMIZE TEMPLATE_DAYS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "admin_all_template_days" ON public.template_days;
CREATE POLICY "admin_all_template_days" ON public.template_days
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.id = (SELECT auth.uid()) 
    AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.id = (SELECT auth.uid()) 
    AND p.role = 'admin'
  )
);

-- ============================================================================
-- OPTIMIZE TEMPLATE_ITEMS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "admin_all_template_items" ON public.template_items;
CREATE POLICY "admin_all_template_items" ON public.template_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.id = (SELECT auth.uid()) 
    AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.id = (SELECT auth.uid()) 
    AND p.role = 'admin'
  )
);

-- ============================================================================
-- OPTIMIZE UX_METRICS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all UX metrics" ON public.ux_metrics;
CREATE POLICY "Admins can view all UX metrics" ON public.ux_metrics
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid()) 
    AND user_roles.role = 'admin'::app_role
  )
);

DROP POLICY IF EXISTS "Users can insert their own UX metrics" ON public.ux_metrics;
CREATE POLICY "Users can insert their own UX metrics" ON public.ux_metrics
FOR INSERT
TO authenticated
WITH CHECK ((user_id = (SELECT auth.uid())) OR (user_id IS NULL));

DROP POLICY IF EXISTS "Users can view their own UX metrics" ON public.ux_metrics;
CREATE POLICY "Users can view their own UX metrics" ON public.ux_metrics
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- OPTIMIZE WORKOUT_FAILURES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can update workout failures" ON public.workout_failures;
CREATE POLICY "Admins can update workout failures" ON public.workout_failures
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid()) 
    AND user_roles.role = 'admin'::app_role
  )
);

DROP POLICY IF EXISTS "Admins can view all workout failures" ON public.workout_failures;
CREATE POLICY "Admins can view all workout failures" ON public.workout_failures
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid()) 
    AND user_roles.role = 'admin'::app_role
  )
);

DROP POLICY IF EXISTS "Users can insert their own workout failures" ON public.workout_failures;
CREATE POLICY "Users can insert their own workout failures" ON public.workout_failures
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their own workout failures" ON public.workout_failures;
CREATE POLICY "Users can view their own workout failures" ON public.workout_failures
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- OPTIMIZE WORKOUT_FEEDBACK POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete their own workout feedback" ON public.workout_feedback;
CREATE POLICY "Users can delete their own workout feedback" ON public.workout_feedback
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own workout feedback" ON public.workout_feedback;
CREATE POLICY "Users can insert their own workout feedback" ON public.workout_feedback
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own workout feedback" ON public.workout_feedback;
CREATE POLICY "Users can update their own workout feedback" ON public.workout_feedback
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own workout feedback" ON public.workout_feedback;
CREATE POLICY "Users can view their own workout feedback" ON public.workout_feedback
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);
