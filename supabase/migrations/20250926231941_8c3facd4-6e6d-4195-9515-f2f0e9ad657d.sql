-- Database Performance Optimization Migration
-- Adding indexes for frequently queried columns and foreign keys

-- 1. User-based queries optimization
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_user_id ON public.subscribers(user_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON public.subscribers(status);
CREATE INDEX IF NOT EXISTS idx_subscribers_trial_ends_at ON public.subscribers(trial_ends_at) WHERE trial_ends_at IS NOT NULL;

-- 2. Workout session performance
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON public.workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_client_program_id ON public.workout_sessions(client_program_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_started_at ON public.workout_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_ended_at ON public.workout_sessions(ended_at) WHERE ended_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workout_sessions_active ON public.workout_sessions(user_id, ended_at) WHERE ended_at IS NULL;

-- 3. Set logs performance (likely high-volume table)
CREATE INDEX IF NOT EXISTS idx_set_logs_user_id ON public.set_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_set_logs_session_id ON public.set_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_set_logs_client_item_id ON public.set_logs(client_item_id);
CREATE INDEX IF NOT EXISTS idx_set_logs_marked_done_at ON public.set_logs(marked_done_at);
CREATE INDEX IF NOT EXISTS idx_set_logs_user_session ON public.set_logs(user_id, session_id);

-- 4. Client program structure optimization
CREATE INDEX IF NOT EXISTS idx_client_programs_assigned_to ON public.client_programs(assigned_to);
CREATE INDEX IF NOT EXISTS idx_client_programs_assigned_by ON public.client_programs(assigned_by);
CREATE INDEX IF NOT EXISTS idx_client_programs_template_id ON public.client_programs(template_id);
CREATE INDEX IF NOT EXISTS idx_client_programs_active ON public.client_programs(assigned_to, is_active);

CREATE INDEX IF NOT EXISTS idx_client_days_program_id ON public.client_days(client_program_id);
CREATE INDEX IF NOT EXISTS idx_client_days_day_order ON public.client_days(client_program_id, day_order);

CREATE INDEX IF NOT EXISTS idx_client_items_day_id ON public.client_items(client_day_id);
CREATE INDEX IF NOT EXISTS idx_client_items_order ON public.client_items(client_day_id, order_in_day);

-- 5. Template structure optimization
CREATE INDEX IF NOT EXISTS idx_template_days_template_id ON public.template_days(template_id);
CREATE INDEX IF NOT EXISTS idx_template_days_order ON public.template_days(template_id, day_order);
CREATE INDEX IF NOT EXISTS idx_template_items_day_id ON public.template_items(template_day_id);
CREATE INDEX IF NOT EXISTS idx_template_items_order ON public.template_items(template_day_id, order_in_day);

-- 6. Analytics and user activity optimization
CREATE INDEX IF NOT EXISTS idx_user_analytics_events_user_id ON public.user_analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_events_created_at ON public.user_analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_user_analytics_events_event_type ON public.user_analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_analytics_events_user_date ON public.user_analytics_events(user_id, created_at);

-- 7. Support system optimization
CREATE INDEX IF NOT EXISTS idx_support_conversations_user_id ON public.support_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_status ON public.support_conversations(status);
CREATE INDEX IF NOT EXISTS idx_support_conversations_last_message ON public.support_conversations(last_message_at);

CREATE INDEX IF NOT EXISTS idx_support_messages_conversation_id ON public.support_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON public.support_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_support_messages_sender_admin ON public.support_messages(conversation_id, is_admin);

-- 8. Rest timers and exercise notes optimization
CREATE INDEX IF NOT EXISTS idx_rest_timers_session_id ON public.rest_timers(session_id);
CREATE INDEX IF NOT EXISTS idx_rest_timers_user_id ON public.rest_timers(user_id);
CREATE INDEX IF NOT EXISTS idx_rest_timers_started_at ON public.rest_timers(started_at);

CREATE INDEX IF NOT EXISTS idx_exercise_notes_session_id ON public.exercise_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_exercise_notes_user_id ON public.exercise_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_notes_client_item ON public.exercise_notes(client_item_id);

-- 9. RPE history optimization
CREATE INDEX IF NOT EXISTS idx_rpe_history_user_id ON public.rpe_history(user_id);
CREATE INDEX IF NOT EXISTS idx_rpe_history_session_id ON public.rpe_history(session_id);
CREATE INDEX IF NOT EXISTS idx_rpe_history_created_at ON public.rpe_history(created_at);

-- 10. Training journal optimization
CREATE INDEX IF NOT EXISTS idx_training_journal_user_id ON public.training_journal(user_id);
CREATE INDEX IF NOT EXISTS idx_training_journal_created_at ON public.training_journal(created_at);
CREATE INDEX IF NOT EXISTS idx_training_journal_session_id ON public.training_journal(session_id) WHERE session_id IS NOT NULL;

-- 11. User entitlements and access optimization
CREATE INDEX IF NOT EXISTS idx_user_entitlements_user_id ON public.user_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_product ON public.user_entitlements(product);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_status ON public.user_entitlements(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_expires_at ON public.user_entitlements(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_access_overrides_user_id ON public.access_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_access_overrides_expires_at ON public.access_overrides(expires_at) WHERE expires_at IS NOT NULL;

-- 12. Challenge system optimization
CREATE INDEX IF NOT EXISTS idx_challenge_logs_user_id ON public.challenge_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_logs_date ON public.challenge_logs(date);
CREATE INDEX IF NOT EXISTS idx_challenge_logs_challenge_id ON public.challenge_logs(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_logs_user_date ON public.challenge_logs(user_id, date);

-- 13. User rewards and streaks optimization
CREATE INDEX IF NOT EXISTS idx_user_rewards_user_id ON public.user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_earned_at ON public.user_rewards(earned_at);
CREATE INDEX IF NOT EXISTS idx_user_rewards_type ON public.user_rewards(reward_type);

CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON public.user_streaks(user_id);

-- 14. Articles optimization
CREATE INDEX IF NOT EXISTS idx_articles_published ON public.articles(published, created_at) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_articles_category ON public.articles(category, published) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles(slug) WHERE published = true;

-- 15. Static program optimization
CREATE INDEX IF NOT EXISTS idx_static_starts_user_id ON public.static_starts(user_id);
CREATE INDEX IF NOT EXISTS idx_static_starts_start_monday ON public.static_starts(start_monday);

-- 16. Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_program_active ON public.workout_sessions(user_id, client_program_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_set_logs_user_recent ON public.set_logs(user_id, marked_done_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_analytics_recent ON public.user_analytics_events(user_id, created_at DESC);

-- Update table statistics to help query planner
ANALYZE public.profiles;
ANALYZE public.subscribers;
ANALYZE public.workout_sessions;
ANALYZE public.set_logs;
ANALYZE public.client_programs;
ANALYZE public.client_days;
ANALYZE public.client_items;
ANALYZE public.user_analytics_events;
ANALYZE public.support_conversations;
ANALYZE public.support_messages;
ANALYZE public.user_entitlements;
ANALYZE public.challenge_logs;