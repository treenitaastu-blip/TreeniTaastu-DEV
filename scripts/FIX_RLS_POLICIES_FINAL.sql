-- =====================================================
-- FIX RLS POLICIES - Drop and Recreate (No IF NOT EXISTS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.custom_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.userprogress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programday ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_notes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DROP EXISTING POLICIES (if they exist, ignore errors)
-- =====================================================
DO $$ 
BEGIN
    -- custom_habits
    DROP POLICY IF EXISTS "Users can view their own habits" ON public.custom_habits;
    DROP POLICY IF EXISTS "Users can insert their own habits" ON public.custom_habits;
    DROP POLICY IF EXISTS "Users can update their own habits" ON public.custom_habits;
    DROP POLICY IF EXISTS "Users can delete their own habits" ON public.custom_habits;
    DROP POLICY IF EXISTS "Service role full access to custom_habits" ON public.custom_habits;
    
    -- workout_sessions
    DROP POLICY IF EXISTS "Users can view their own workout sessions" ON public.workout_sessions;
    DROP POLICY IF EXISTS "Users can insert their own workout sessions" ON public.workout_sessions;
    DROP POLICY IF EXISTS "Users can update their own workout sessions" ON public.workout_sessions;
    DROP POLICY IF EXISTS "Users can delete their own workout sessions" ON public.workout_sessions;
    DROP POLICY IF EXISTS "Service role full access to workout_sessions" ON public.workout_sessions;
    
    -- userprogress
    DROP POLICY IF EXISTS "Users can view their own progress" ON public.userprogress;
    DROP POLICY IF EXISTS "Users can insert their own progress" ON public.userprogress;
    DROP POLICY IF EXISTS "Users can update their own progress" ON public.userprogress;
    DROP POLICY IF EXISTS "Users can delete their own progress" ON public.userprogress;
    DROP POLICY IF EXISTS "Service role full access to userprogress" ON public.userprogress;
    
    -- programday
    DROP POLICY IF EXISTS "Anyone can view program days" ON public.programday;
    
    -- access_overrides
    DROP POLICY IF EXISTS "Users can view their own access overrides" ON public.access_overrides;
    DROP POLICY IF EXISTS "Service role can manage access overrides" ON public.access_overrides;
    
    -- support_conversations
    DROP POLICY IF EXISTS "Users can view their own conversations" ON public.support_conversations;
    DROP POLICY IF EXISTS "Users can create conversations" ON public.support_conversations;
    DROP POLICY IF EXISTS "Users can update their own conversations" ON public.support_conversations;
    
    -- support_messages
    DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.support_messages;
    DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON public.support_messages;
    
    -- user_streaks
    DROP POLICY IF EXISTS "Users can view their own streaks" ON public.user_streaks;
    DROP POLICY IF EXISTS "Users can insert their own streaks" ON public.user_streaks;
    DROP POLICY IF EXISTS "Users can update their own streaks" ON public.user_streaks;
    DROP POLICY IF EXISTS "Service role full access to user_streaks" ON public.user_streaks;
    
    -- training_journal
    DROP POLICY IF EXISTS "Users can view their own journal" ON public.training_journal;
    DROP POLICY IF EXISTS "Users can insert their own journal" ON public.training_journal;
    DROP POLICY IF EXISTS "Users can update their own journal" ON public.training_journal;
    DROP POLICY IF EXISTS "Users can delete their own journal" ON public.training_journal;
    DROP POLICY IF EXISTS "Service role full access to training_journal" ON public.training_journal;
    
    -- set_logs
    DROP POLICY IF EXISTS "Users can view their own set logs" ON public.set_logs;
    DROP POLICY IF EXISTS "Users can insert their own set logs" ON public.set_logs;
    DROP POLICY IF EXISTS "Users can update their own set logs" ON public.set_logs;
    DROP POLICY IF EXISTS "Users can delete their own set logs" ON public.set_logs;
    DROP POLICY IF EXISTS "Service role full access to set_logs" ON public.set_logs;
    
    -- exercise_notes
    DROP POLICY IF EXISTS "Users can view their own exercise notes" ON public.exercise_notes;
    DROP POLICY IF EXISTS "Users can insert their own exercise notes" ON public.exercise_notes;
    DROP POLICY IF EXISTS "Users can update their own exercise notes" ON public.exercise_notes;
    DROP POLICY IF EXISTS "Users can delete their own exercise notes" ON public.exercise_notes;
    DROP POLICY IF EXISTS "Service role full access to exercise_notes" ON public.exercise_notes;
END $$;

-- =====================================================
-- CREATE NEW POLICIES
-- =====================================================

-- CUSTOM_HABITS
CREATE POLICY "Users can view their own habits"
  ON public.custom_habits FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own habits"
  ON public.custom_habits FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own habits"
  ON public.custom_habits FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own habits"
  ON public.custom_habits FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Service role full access to custom_habits"
  ON public.custom_habits FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- WORKOUT_SESSIONS
CREATE POLICY "Users can view their own workout sessions"
  ON public.workout_sessions FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own workout sessions"
  ON public.workout_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own workout sessions"
  ON public.workout_sessions FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own workout sessions"
  ON public.workout_sessions FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Service role full access to workout_sessions"
  ON public.workout_sessions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- USERPROGRESS
CREATE POLICY "Users can view their own progress"
  ON public.userprogress FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own progress"
  ON public.userprogress FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own progress"
  ON public.userprogress FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own progress"
  ON public.userprogress FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Service role full access to userprogress"
  ON public.userprogress FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- PROGRAMDAY (All authenticated users can read)
CREATE POLICY "Anyone can view program days"
  ON public.programday FOR SELECT
  TO authenticated, anon
  USING (true);

-- ACCESS_OVERRIDES
CREATE POLICY "Users can view their own access overrides"
  ON public.access_overrides FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Service role can manage access overrides"
  ON public.access_overrides FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- SUPPORT_CONVERSATIONS
CREATE POLICY "Users can view their own conversations"
  ON public.support_conversations FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create conversations"
  ON public.support_conversations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own conversations"
  ON public.support_conversations FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- SUPPORT_MESSAGES
CREATE POLICY "Users can view messages in their conversations"
  ON public.support_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_conversations
      WHERE support_conversations.id = support_messages.conversation_id
      AND support_conversations.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can insert messages in their conversations"
  ON public.support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_conversations
      WHERE support_conversations.id = support_messages.conversation_id
      AND support_conversations.user_id = (SELECT auth.uid())
    )
  );

-- USER_STREAKS
CREATE POLICY "Users can view their own streaks"
  ON public.user_streaks FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own streaks"
  ON public.user_streaks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own streaks"
  ON public.user_streaks FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Service role full access to user_streaks"
  ON public.user_streaks FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- TRAINING_JOURNAL
CREATE POLICY "Users can view their own journal"
  ON public.training_journal FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own journal"
  ON public.training_journal FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own journal"
  ON public.training_journal FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own journal"
  ON public.training_journal FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Service role full access to training_journal"
  ON public.training_journal FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- SET_LOGS
CREATE POLICY "Users can view their own set logs"
  ON public.set_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions
      WHERE workout_sessions.id = set_logs.session_id
      AND workout_sessions.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can insert their own set logs"
  ON public.set_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_sessions
      WHERE workout_sessions.id = set_logs.session_id
      AND workout_sessions.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update their own set logs"
  ON public.set_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions
      WHERE workout_sessions.id = set_logs.session_id
      AND workout_sessions.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete their own set logs"
  ON public.set_logs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions
      WHERE workout_sessions.id = set_logs.session_id
      AND workout_sessions.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Service role full access to set_logs"
  ON public.set_logs FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- EXERCISE_NOTES
CREATE POLICY "Users can view their own exercise notes"
  ON public.exercise_notes FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own exercise notes"
  ON public.exercise_notes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own exercise notes"
  ON public.exercise_notes FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own exercise notes"
  ON public.exercise_notes FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Service role full access to exercise_notes"
  ON public.exercise_notes FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT '✅ All RLS policies created successfully!' as status;

-- Verify policies
SELECT 
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('custom_habits', 'workout_sessions', 'userprogress', 'programday', 'access_overrides', 'support_conversations')
ORDER BY tablename, policyname;


