-- Fix Performance and Security Issues Migration
-- This addresses 107+ performance warnings and 1 security error

-- PART 1: Fix Security Definer View Issue
-- Drop and recreate v_static_status view without SECURITY DEFINER
DROP VIEW IF EXISTS public.v_static_status;

-- Create the view without SECURITY DEFINER property
CREATE VIEW public.v_static_status AS
SELECT 
  user_id,
  start_monday,
  CASE 
    WHEN start_monday <= CURRENT_DATE THEN 'active'
    ELSE 'pending'
  END as status,
  CURRENT_DATE - start_monday as days_since_start
FROM public.static_starts;

-- PART 2: Fix Auth RLS Initialization Plan Issues
-- Replace auth.uid() with (select auth.uid()) in all RLS policies

-- Fix profiles policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_self_or_admin" ON public.profiles
FOR SELECT USING ((id = (select auth.uid())) OR is_admin((select auth.uid())));

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "profiles_update_own_no_role" ON public.profiles;
CREATE POLICY "profiles_update_own_no_role" ON public.profiles
FOR UPDATE USING (id = (select auth.uid())) WITH CHECK (id = (select auth.uid()));

-- Fix client_programs policies
DROP POLICY IF EXISTS "cp_select_self_or_admin" ON public.client_programs;
CREATE POLICY "cp_select_self_or_admin" ON public.client_programs
FOR SELECT USING ((assigned_to = (select auth.uid())) OR is_admin());

DROP POLICY IF EXISTS "cp_select_assignee_or_admin" ON public.client_programs;
CREATE POLICY "cp_select_assignee_or_admin" ON public.client_programs
FOR SELECT USING ((assigned_to = (select auth.uid())) OR (assigned_by = (select auth.uid())) OR is_admin());

DROP POLICY IF EXISTS "cp_insert_coach_only" ON public.client_programs;
CREATE POLICY "cp_insert_coach_only" ON public.client_programs
FOR INSERT WITH CHECK ((assigned_by = (select auth.uid())) OR is_admin());

DROP POLICY IF EXISTS "cp_update_coach_only" ON public.client_programs;
CREATE POLICY "cp_update_coach_only" ON public.client_programs
FOR UPDATE USING ((assigned_by = (select auth.uid())) OR is_admin()) 
WITH CHECK ((assigned_by = (select auth.uid())) OR is_admin());

DROP POLICY IF EXISTS "cp_delete_coach_only" ON public.client_programs;
CREATE POLICY "cp_delete_coach_only" ON public.client_programs
FOR DELETE USING ((assigned_by = (select auth.uid())) OR is_admin());

-- Fix client_days policies
DROP POLICY IF EXISTS "cd_select_self_or_admin" ON public.client_days;
CREATE POLICY "cd_select_self_or_admin" ON public.client_days
FOR SELECT USING (EXISTS (
  SELECT 1 FROM client_programs p
  WHERE p.id = client_days.client_program_id 
    AND ((p.assigned_to = (select auth.uid())) OR is_admin((select auth.uid())))
));

DROP POLICY IF EXISTS "cdays_select_assignee_or_admin" ON public.client_days;
CREATE POLICY "cdays_select_assignee_or_admin" ON public.client_days
FOR SELECT USING (EXISTS (
  SELECT 1 FROM client_programs cp
  WHERE cp.id = client_days.client_program_id 
    AND ((cp.assigned_to = (select auth.uid())) OR (cp.assigned_by = (select auth.uid())) OR is_admin())
));

DROP POLICY IF EXISTS "cdays_insert_coach_only" ON public.client_days;
CREATE POLICY "cdays_insert_coach_only" ON public.client_days
FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM client_programs cp
  WHERE cp.id = client_days.client_program_id 
    AND ((cp.assigned_by = (select auth.uid())) OR is_admin())
));

DROP POLICY IF EXISTS "cdays_update_coach_only" ON public.client_days;
CREATE POLICY "cdays_update_coach_only" ON public.client_days
FOR UPDATE USING (EXISTS (
  SELECT 1 FROM client_programs cp
  WHERE cp.id = client_days.client_program_id 
    AND ((cp.assigned_by = (select auth.uid())) OR is_admin())
)) WITH CHECK (EXISTS (
  SELECT 1 FROM client_programs cp
  WHERE cp.id = client_days.client_program_id 
    AND ((cp.assigned_by = (select auth.uid())) OR is_admin())
));

DROP POLICY IF EXISTS "cdays_delete_coach_only" ON public.client_days;
CREATE POLICY "cdays_delete_coach_only" ON public.client_days
FOR DELETE USING (EXISTS (
  SELECT 1 FROM client_programs cp
  WHERE cp.id = client_days.client_program_id 
    AND ((cp.assigned_by = (select auth.uid())) OR is_admin())
));

-- Fix client_items policies
DROP POLICY IF EXISTS "ci_select_self_or_admin" ON public.client_items;
CREATE POLICY "ci_select_self_or_admin" ON public.client_items
FOR SELECT USING (EXISTS (
  SELECT 1 FROM client_days d
  JOIN client_programs p ON p.id = d.client_program_id
  WHERE d.id = client_items.client_day_id 
    AND ((p.assigned_to = (select auth.uid())) OR is_admin((select auth.uid())))
));

DROP POLICY IF EXISTS "citems_select_assignee_or_admin" ON public.client_items;
CREATE POLICY "citems_select_assignee_or_admin" ON public.client_items
FOR SELECT USING (EXISTS (
  SELECT 1 FROM client_days cd
  JOIN client_programs cp ON cp.id = cd.client_program_id
  WHERE cd.id = client_items.client_day_id 
    AND ((cp.assigned_to = (select auth.uid())) OR (cp.assigned_by = (select auth.uid())) OR is_admin())
));

DROP POLICY IF EXISTS "citems_insert_coach_only" ON public.client_items;
CREATE POLICY "citems_insert_coach_only" ON public.client_items
FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM client_days cd
  JOIN client_programs cp ON cp.id = cd.client_program_id
  WHERE cd.id = client_items.client_day_id 
    AND ((cp.assigned_by = (select auth.uid())) OR is_admin())
));

DROP POLICY IF EXISTS "citems_update_coach_only" ON public.client_items;
CREATE POLICY "citems_update_coach_only" ON public.client_items
FOR UPDATE USING (EXISTS (
  SELECT 1 FROM client_days cd
  JOIN client_programs cp ON cp.id = cd.client_program_id
  WHERE cd.id = client_items.client_day_id 
    AND ((cp.assigned_by = (select auth.uid())) OR is_admin())
)) WITH CHECK (EXISTS (
  SELECT 1 FROM client_days cd
  JOIN client_programs cp ON cp.id = cd.client_program_id
  WHERE cd.id = client_items.client_day_id 
    AND ((cp.assigned_by = (select auth.uid())) OR is_admin())
));

-- Fix static_starts policies
DROP POLICY IF EXISTS "sst_select_own" ON public.static_starts;
CREATE POLICY "sst_select_own" ON public.static_starts
FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "sst_select_admin" ON public.static_starts;
CREATE POLICY "sst_select_admin" ON public.static_starts
FOR SELECT USING (is_admin((select auth.uid())));

DROP POLICY IF EXISTS "sst_insert_own" ON public.static_starts;
CREATE POLICY "sst_insert_own" ON public.static_starts
FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "sst_update_own" ON public.static_starts;
CREATE POLICY "sst_update_own" ON public.static_starts
FOR UPDATE USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "sst_write_admin" ON public.static_starts;
CREATE POLICY "sst_write_admin" ON public.static_starts
FOR ALL USING (is_admin((select auth.uid()))) WITH CHECK (is_admin((select auth.uid())));

-- Fix access_overrides policies
DROP POLICY IF EXISTS "access_overrides_select_own" ON public.access_overrides;
CREATE POLICY "access_overrides_select_own" ON public.access_overrides
FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "access_overrides_select_self" ON public.access_overrides;
CREATE POLICY "access_overrides_select_self" ON public.access_overrides
FOR SELECT USING (user_id = (select auth.uid()));

-- Fix user_entitlements policies
DROP POLICY IF EXISTS "ue_select_self_or_admin" ON public.user_entitlements;
CREATE POLICY "ue_select_self_or_admin" ON public.user_entitlements
FOR SELECT USING ((user_id = (select auth.uid())) OR is_admin());

DROP POLICY IF EXISTS "ue_admin_write" ON public.user_entitlements;
CREATE POLICY "ue_admin_write" ON public.user_entitlements
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Fix user_analytics_events policies
DROP POLICY IF EXISTS "users_can_insert_own_events" ON public.user_analytics_events;
CREATE POLICY "users_can_insert_own_events" ON public.user_analytics_events
FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "users_can_view_own_events" ON public.user_analytics_events;
CREATE POLICY "users_can_view_own_events" ON public.user_analytics_events
FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "admins_can_view_all_events" ON public.user_analytics_events;
CREATE POLICY "admins_can_view_all_events" ON public.user_analytics_events
FOR SELECT USING (is_admin());

-- Fix rpe_history policies
DROP POLICY IF EXISTS "rpe_select_self" ON public.rpe_history;
CREATE POLICY "rpe_select_self" ON public.rpe_history
FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "rpe_insert_self" ON public.rpe_history;
CREATE POLICY "rpe_insert_self" ON public.rpe_history
FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "rpe_update_self" ON public.rpe_history;
CREATE POLICY "rpe_update_self" ON public.rpe_history
FOR UPDATE USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

-- Fix training_journal policies
DROP POLICY IF EXISTS "Users can view their own journal entries" ON public.training_journal;
CREATE POLICY "Users can view their own journal entries" ON public.training_journal
FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create their own journal entries" ON public.training_journal;
CREATE POLICY "Users can create their own journal entries" ON public.training_journal
FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own journal entries" ON public.training_journal;
CREATE POLICY "Users can update their own journal entries" ON public.training_journal
FOR UPDATE USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own journal entries" ON public.training_journal;
CREATE POLICY "Users can delete their own journal entries" ON public.training_journal
FOR DELETE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all journal entries" ON public.training_journal;
CREATE POLICY "Admins can view all journal entries" ON public.training_journal
FOR SELECT USING (is_admin());

-- Fix challenge_logs policies
DROP POLICY IF EXISTS "challenge_logs_select_own" ON public.challenge_logs;
CREATE POLICY "challenge_logs_select_own" ON public.challenge_logs
FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "challenge_logs_insert_own" ON public.challenge_logs;
CREATE POLICY "challenge_logs_insert_own" ON public.challenge_logs
FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "challenge_logs_update_own" ON public.challenge_logs;
CREATE POLICY "challenge_logs_update_own" ON public.challenge_logs
FOR UPDATE USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "challenge_logs_delete_own" ON public.challenge_logs;
CREATE POLICY "challenge_logs_delete_own" ON public.challenge_logs
FOR DELETE USING (user_id = (select auth.uid()));

-- Fix user_rewards policies
DROP POLICY IF EXISTS "Users can insert their own rewards" ON public.user_rewards;
CREATE POLICY "Users can insert their own rewards" ON public.user_rewards
FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "user_rewards_select" ON public.user_rewards;
CREATE POLICY "user_rewards_select" ON public.user_rewards
FOR SELECT USING ((user_id = (select auth.uid())) OR (EXISTS (
  SELECT 1 FROM profiles pr
  WHERE pr.id = (select auth.uid()) AND COALESCE(pr.role, '') = 'admin'
)));

-- Fix subscribers policies - keep admin and own separate for security
DROP POLICY IF EXISTS "subscribers_select_own_only" ON public.subscribers;
CREATE POLICY "subscribers_select_own_only" ON public.subscribers
FOR SELECT USING (user_id = (select auth.uid()));

-- Fix set_logs and exercise_notes policies
DROP POLICY IF EXISTS "sl_select_owner_or_admin" ON public.set_logs;
CREATE POLICY "sl_select_owner_or_admin" ON public.set_logs
FOR SELECT USING (EXISTS (
  SELECT 1 FROM workout_sessions ws
  WHERE ws.id = set_logs.session_id 
    AND ((ws.user_id = (select auth.uid())) OR is_admin((select auth.uid())))
));

DROP POLICY IF EXISTS "sl_insert_owner_or_admin" ON public.set_logs;
CREATE POLICY "sl_insert_owner_or_admin" ON public.set_logs
FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM workout_sessions ws
  WHERE ws.id = set_logs.session_id 
    AND ((ws.user_id = (select auth.uid())) OR is_admin((select auth.uid())))
));

DROP POLICY IF EXISTS "en_select_owner_or_admin" ON public.exercise_notes;
CREATE POLICY "en_select_owner_or_admin" ON public.exercise_notes
FOR SELECT USING (EXISTS (
  SELECT 1 FROM workout_sessions ws
  WHERE ws.id = exercise_notes.session_id 
    AND ((ws.user_id = (select auth.uid())) OR is_admin((select auth.uid())))
));

DROP POLICY IF EXISTS "exercise_notes_insert_own" ON public.exercise_notes;
CREATE POLICY "exercise_notes_insert_own" ON public.exercise_notes
FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "exercise_notes_update_own" ON public.exercise_notes;
CREATE POLICY "exercise_notes_update_own" ON public.exercise_notes
FOR UPDATE USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "exercise_notes_delete_own" ON public.exercise_notes;
CREATE POLICY "exercise_notes_delete_own" ON public.exercise_notes
FOR DELETE USING (user_id = (select auth.uid()));

-- Fix rest_timers policies
DROP POLICY IF EXISTS "pt_resttimers_all" ON public.rest_timers;
CREATE POLICY "pt_resttimers_all" ON public.rest_timers
FOR ALL USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

-- Fix template policies
DROP POLICY IF EXISTS "td_select_admin" ON public.template_days;
CREATE POLICY "td_select_admin" ON public.template_days
FOR SELECT USING (is_admin((select auth.uid())));

DROP POLICY IF EXISTS "ti_select_admin" ON public.template_items;
CREATE POLICY "ti_select_admin" ON public.template_items
FOR SELECT USING (is_admin((select auth.uid())));

-- Fix support system policies
DROP POLICY IF EXISTS "Users can view own conversations" ON public.support_conversations;
CREATE POLICY "Users can view own conversations" ON public.support_conversations
FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create conversations" ON public.support_conversations;
CREATE POLICY "Users can create conversations" ON public.support_conversations
FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own conversations" ON public.support_conversations;
CREATE POLICY "Users can update own conversations" ON public.support_conversations
FOR UPDATE USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can send messages in own conversations" ON public.support_messages;
CREATE POLICY "Users can send messages in own conversations" ON public.support_messages
FOR INSERT WITH CHECK ((sender_id = (select auth.uid())) AND (is_admin = false) AND (EXISTS (
  SELECT 1 FROM support_conversations sc
  WHERE sc.id = support_messages.conversation_id AND sc.user_id = (select auth.uid())
)));

DROP POLICY IF EXISTS "Users can view messages in own conversations" ON public.support_messages;
CREATE POLICY "Users can view messages in own conversations" ON public.support_messages
FOR SELECT USING (EXISTS (
  SELECT 1 FROM support_conversations sc
  WHERE sc.id = support_messages.conversation_id AND sc.user_id = (select auth.uid())
));

DROP POLICY IF EXISTS "Admins can send messages" ON public.support_messages;
CREATE POLICY "Admins can send messages" ON public.support_messages
FOR INSERT WITH CHECK (is_admin() AND (sender_id = (select auth.uid())) AND (is_admin = true));

-- PART 3: Consolidate Multiple Permissive Policies (Performance Improvement)
-- Use the combine_policies function to merge policies for better performance

-- Combine access_overrides policies
SELECT combine_policies('public', 'access_overrides', 'authenticated', 'r', 'access_overrides_select_combined');

-- Combine profiles policies  
SELECT combine_policies('public', 'profiles', 'authenticated', 'r', 'profiles_select_combined');

-- Combine client_programs policies
SELECT combine_policies('public', 'client_programs', 'authenticated', 'r', 'client_programs_select_combined');
SELECT combine_policies('public', 'client_programs', 'authenticated', 'a', 'client_programs_insert_combined');
SELECT combine_policies('public', 'client_programs', 'authenticated', 'w', 'client_programs_update_combined');

-- Combine client_days policies
SELECT combine_policies('public', 'client_days', 'authenticated', 'r', 'client_days_select_combined');

-- Combine client_items policies
SELECT combine_policies('public', 'client_items', 'authenticated', 'r', 'client_items_select_combined');

-- Combine static_starts policies
SELECT combine_policies('public', 'static_starts', 'authenticated', 'r', 'static_starts_select_combined');
SELECT combine_policies('public', 'static_starts', 'authenticated', 'a', 'static_starts_insert_combined');
SELECT combine_policies('public', 'static_starts', 'authenticated', 'w', 'static_starts_update_combined');

-- Combine subscribers policies
SELECT combine_policies('public', 'subscribers', 'authenticated', 'r', 'subscribers_select_combined');

-- Combine support_conversations policies
SELECT combine_policies('public', 'support_conversations', 'authenticated', 'r', 'support_conversations_select_combined');
SELECT combine_policies('public', 'support_conversations', 'authenticated', 'w', 'support_conversations_update_combined');

-- Combine support_messages policies
SELECT combine_policies('public', 'support_messages', 'authenticated', 'r', 'support_messages_select_combined');

-- Update statistics after policy changes
ANALYZE public.profiles;
ANALYZE public.client_programs;
ANALYZE public.client_days;
ANALYZE public.client_items;
ANALYZE public.static_starts;
ANALYZE public.subscribers;
ANALYZE public.user_analytics_events;
ANALYZE public.training_journal;
ANALYZE public.support_conversations;
ANALYZE public.support_messages;