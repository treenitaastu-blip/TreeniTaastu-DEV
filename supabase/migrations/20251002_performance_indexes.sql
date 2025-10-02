-- Performance optimization indexes for scalability
-- Run this migration to fix critical performance bottlenecks

-- Index for profiles table (used in UserManagement.tsx)
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role) WHERE role IS NOT NULL;

-- Index for support conversations (used in SupportChatDashboard.tsx)
CREATE INDEX IF NOT EXISTS idx_support_conversations_status_last_message ON public.support_conversations(status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_conversations_user_id ON public.support_conversations(user_id);

-- Index for support messages (real-time subscriptions)
CREATE INDEX IF NOT EXISTS idx_support_messages_conversation_id ON public.support_messages(conversation_id, created_at DESC);

-- Index for set_logs (workout tracking real-time)
CREATE INDEX IF NOT EXISTS idx_set_logs_session_id ON public.set_logs(session_id, marked_done_at DESC);
CREATE INDEX IF NOT EXISTS idx_set_logs_user_session ON public.set_logs(session_id) WHERE marked_done_at IS NOT NULL;

-- Index for workout_sessions (analytics queries)
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_started ON public.workout_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_ended ON public.workout_sessions(ended_at) WHERE ended_at IS NOT NULL;

-- Index for user_entitlements (access control)
CREATE INDEX IF NOT EXISTS idx_user_entitlements_user_status ON public.user_entitlements(user_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_product_active ON public.user_entitlements(product, status) WHERE status IN ('active', 'trialing');

-- Index for userprogress (Home.tsx analytics)
CREATE INDEX IF NOT EXISTS idx_userprogress_user_completed ON public.userprogress(user_id, completed_at DESC) WHERE done = true;

-- Index for client_programs (admin queries)
CREATE INDEX IF NOT EXISTS idx_client_programs_assigned_active ON public.client_programs(assigned_to, is_active, inserted_at DESC);

-- Index for exercise_notes (RPE/RIR tracking)
CREATE INDEX IF NOT EXISTS idx_exercise_notes_session_item ON public.exercise_notes(session_id, client_item_id);
CREATE INDEX IF NOT EXISTS idx_exercise_notes_user_id ON public.exercise_notes(user_id, created_at DESC);

-- Composite index for analytics views
CREATE INDEX IF NOT EXISTS idx_user_analytics_events_user_date ON public.user_analytics_events(user_id, created_at DESC);

-- Comments for monitoring
COMMENT ON INDEX idx_profiles_created_at IS 'Optimizes UserManagement.tsx user listing';
COMMENT ON INDEX idx_support_conversations_status_last_message IS 'Optimizes SupportChatDashboard.tsx conversation loading';
COMMENT ON INDEX idx_set_logs_session_id IS 'Optimizes real-time workout tracking';
COMMENT ON INDEX idx_user_entitlements_user_status IS 'Optimizes access control checks';

-- Analyze tables after creating indexes
ANALYZE public.profiles;
ANALYZE public.support_conversations;
ANALYZE public.support_messages;
ANALYZE public.set_logs;
ANALYZE public.workout_sessions;
ANALYZE public.user_entitlements;
ANALYZE public.userprogress;
ANALYZE public.client_programs;
ANALYZE public.exercise_notes;
ANALYZE public.user_analytics_events;



