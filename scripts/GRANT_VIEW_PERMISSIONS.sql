-- =====================================================
-- GRANT PERMISSIONS FOR VIEWS
-- Views don't have RLS, but need GRANT permissions
-- =====================================================

-- Grant access to all views
GRANT SELECT ON public.v_user_weekly TO authenticated;
GRANT SELECT ON public.v_session_summary TO authenticated;
GRANT SELECT ON public.v_user_entitlement TO authenticated;
GRANT SELECT ON public.v_static_status TO authenticated;
GRANT SELECT ON public.v_userprogress_with_day TO authenticated;

-- Also ensure underlying tables that views depend on have proper grants
-- (These were already in GRANT_ALL_PERMISSIONS.sql but let's be explicit)
GRANT SELECT ON public.workout_sessions TO authenticated;
GRANT SELECT ON public.set_logs TO authenticated;
GRANT SELECT ON public.userprogress TO authenticated;
GRANT SELECT ON public.user_streaks TO authenticated;
GRANT SELECT ON public.user_entitlements TO authenticated;

-- Success message
SELECT '✅ View permissions granted!' as status;

-- Verify view permissions
SELECT 
  table_name,
  privilege_type
FROM information_schema.role_table_grants 
WHERE grantee = 'authenticated' 
AND table_name LIKE 'v_%'
AND table_schema = 'public'
ORDER BY table_name;


