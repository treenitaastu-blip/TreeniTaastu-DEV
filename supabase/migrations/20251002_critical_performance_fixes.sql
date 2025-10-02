-- Critical Performance Fixes for 100+ User Scalability
-- Run this migration IMMEDIATELY to prevent system failures

-- 1. Add critical indexes for user management queries
CREATE INDEX IF NOT EXISTS idx_profiles_created_at_desc ON public.profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role_active ON public.profiles(role) WHERE role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_email_lookup ON public.profiles(email) WHERE email IS NOT NULL;

-- 2. Add indexes for workout session queries (high frequency)
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_created ON public.workout_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_program_day ON public.workout_sessions(program_day_id, created_at DESC);

-- 3. Add indexes for support system (growing load)
CREATE INDEX IF NOT EXISTS idx_support_conversations_status_updated ON public.support_conversations(status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_conversations_user_active ON public.support_conversations(user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_support_messages_conversation_time ON public.support_messages(conversation_id, created_at DESC);

-- 4. Add indexes for user progress tracking
CREATE INDEX IF NOT EXISTS idx_userprogress_user_day ON public.userprogress(user_id, program_day_id);
CREATE INDEX IF NOT EXISTS idx_userprogress_completed_at ON public.userprogress(completed_at DESC) WHERE completed_at IS NOT NULL;

-- 5. Add indexes for entitlements and access control
CREATE INDEX IF NOT EXISTS idx_user_entitlements_user_active ON public.user_entitlements(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_entitlements_product_active ON public.user_entitlements(product_id, is_active) WHERE is_active = true;

-- 6. Add indexes for subscription management
CREATE INDEX IF NOT EXISTS idx_subscribers_stripe_status ON public.subscribers(stripe_subscription_status) WHERE stripe_subscription_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscribers_user_active ON public.subscribers(user_id) WHERE stripe_subscription_status = 'active';

-- 7. Optimize real-time subscriptions with partial indexes
CREATE INDEX IF NOT EXISTS idx_workout_sessions_realtime ON public.workout_sessions(user_id, updated_at DESC) WHERE updated_at > NOW() - INTERVAL '1 hour';

-- 8. Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_profiles_role_created ON public.profiles(role, created_at DESC) WHERE role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_conversations_user_status ON public.support_conversations(user_id, status, created_at DESC);

-- 9. Performance optimization for admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_admin_overview ON public.profiles(created_at DESC, role, is_paid) WHERE role IS NOT NULL;

-- 10. Add statistics update to ensure query planner has fresh data
ANALYZE public.profiles;
ANALYZE public.workout_sessions;
ANALYZE public.support_conversations;
ANALYZE public.user_entitlements;
ANALYZE public.subscribers;

-- Performance monitoring view for admin dashboard
CREATE OR REPLACE VIEW public.v_performance_metrics AS
SELECT 
  'users' as metric_type,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as last_30_days,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_7_days
FROM public.profiles
UNION ALL
SELECT 
  'workout_sessions' as metric_type,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as last_30_days,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_7_days
FROM public.workout_sessions
UNION ALL
SELECT 
  'support_conversations' as metric_type,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as last_30_days,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_7_days
FROM public.support_conversations;

-- Grant access to the performance metrics view
GRANT SELECT ON public.v_performance_metrics TO authenticated;
GRANT SELECT ON public.v_performance_metrics TO anon;

