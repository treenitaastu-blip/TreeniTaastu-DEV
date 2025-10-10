-- =====================================================
-- GRANT PERMISSIONS TO ALL TABLES FOR AUTHENTICATED USERS
-- This fixes all 403 permission denied errors
-- =====================================================

-- Core user tables
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.user_entitlements TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.subscribers TO authenticated;

-- Progress tracking tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.userprogress TO authenticated;
GRANT SELECT ON public.programday TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.set_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_notes TO authenticated;

-- Habits and custom tracking
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_habits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_journal TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_streaks TO authenticated;

-- Support system
GRANT SELECT, INSERT, UPDATE ON public.support_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.support_messages TO authenticated;

-- Analytics and views
GRANT SELECT ON public.v_user_weekly TO authenticated;
GRANT SELECT ON public.v_session_summary TO authenticated;
GRANT SELECT ON public.v_user_entitlement TO authenticated;
GRANT SELECT ON public.v_static_status TO authenticated;
GRANT SELECT ON public.v_userprogress_with_day TO authenticated;

-- Exercises and content
GRANT SELECT ON public.exercises TO authenticated, anon;
GRANT SELECT ON public.articles TO authenticated, anon;

-- Personal training tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_programs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_days TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_items TO authenticated;
GRANT SELECT ON public.workout_templates TO authenticated;
GRANT SELECT ON public.template_days TO authenticated;
GRANT SELECT ON public.template_items TO authenticated;

-- Booking system
GRANT SELECT, INSERT, UPDATE ON public.booking_requests TO authenticated;

-- Analytics
GRANT SELECT, INSERT ON public.user_analytics_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.challenge_logs TO authenticated;

-- User roles
GRANT SELECT ON public.user_roles TO authenticated;

-- Static program
GRANT SELECT, INSERT, UPDATE ON public.static_starts TO authenticated;

-- Success message
SELECT '✅ All table permissions granted to authenticated users!' as status;

-- Verify some key tables
SELECT 
  table_name,
  string_agg(privilege_type, ', ' ORDER BY privilege_type) as privileges
FROM information_schema.role_table_grants 
WHERE grantee = 'authenticated' 
AND table_name IN ('profiles', 'user_entitlements', 'userprogress', 'custom_habits', 'workout_sessions')
AND table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;


