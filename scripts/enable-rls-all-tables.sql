-- Enable Row Level Security (RLS) on All Tables
-- This script will enable RLS on all tables that don't have it yet

-- Core user tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- Workout and program tables
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

-- Progress and analytics tables
ALTER TABLE userprogress ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;

-- Support system tables
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Other feature tables
ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE rest_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rpe_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE static_starts ENABLE ROW LEVEL SECURITY;
ALTER TABLE timezones ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_journal ENABLE ROW LEVEL SECURITY;

-- Backup tables
ALTER TABLE programday_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_logs_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE userprogress_backup ENABLE ROW LEVEL SECURITY;

-- Views (these are read-only, but enable RLS for consistency)
ALTER TABLE v_access_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE v_client_programs_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE v_program_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE v_program_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE v_session_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE v_static_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE v_user_entitlement ENABLE ROW LEVEL SECURITY;
ALTER TABLE v_user_weekly ENABLE ROW LEVEL SECURITY;
ALTER TABLE v_userprogress_with_day ENABLE ROW LEVEL SECURITY;

-- Legacy tables
ALTER TABLE programday ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for user-owned data
-- Users can only see their own data

-- Profiles: Users can only see their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR ALL USING (auth.uid() = id);

-- User entitlements: Users can only see their own entitlements
CREATE POLICY "Users can view own entitlements" ON user_entitlements
    FOR ALL USING (auth.uid() = user_id);

-- User roles: Users can only see their own roles
CREATE POLICY "Users can view own roles" ON user_roles
    FOR ALL USING (auth.uid() = user_id);

-- Subscribers: Users can only see their own subscription
CREATE POLICY "Users can view own subscription" ON subscribers
    FOR ALL USING (auth.uid() = user_id);

-- Client programs: Users can only see programs assigned to them
CREATE POLICY "Users can view assigned programs" ON client_programs
    FOR ALL USING (auth.uid() = user_id OR auth.uid() = assigned_to);

-- Client days: Users can only see days from their programs
CREATE POLICY "Users can view assigned program days" ON client_days
    FOR ALL USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM client_programs 
            WHERE client_programs.id = client_days.client_program_id 
            AND client_programs.assigned_to = auth.uid()
        )
    );

-- Client items: Users can only see items from their programs
CREATE POLICY "Users can view assigned program items" ON client_items
    FOR ALL USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM client_programs cp
            JOIN client_days cd ON cd.client_program_id = cp.id
            WHERE cd.id = client_items.client_day_id 
            AND cp.assigned_to = auth.uid()
        )
    );

-- Workout sessions: Users can only see their own sessions
CREATE POLICY "Users can view own workout sessions" ON workout_sessions
    FOR ALL USING (auth.uid() = user_id);

-- User progress: Users can only see their own progress
CREATE POLICY "Users can view own progress" ON userprogress
    FOR ALL USING (auth.uid() = user_id);

-- Set logs: Users can only see their own set logs
CREATE POLICY "Users can view own set logs" ON set_logs
    FOR ALL USING (auth.uid() = user_id);

-- Exercise notes: Users can only see their own notes
CREATE POLICY "Users can view own exercise notes" ON exercise_notes
    FOR ALL USING (auth.uid() = user_id);

-- User analytics: Users can only see their own analytics
CREATE POLICY "Users can view own analytics" ON user_analytics_events
    FOR ALL USING (auth.uid() = user_id);

-- User streaks: Users can only see their own streaks
CREATE POLICY "Users can view own streaks" ON user_streaks
    FOR ALL USING (auth.uid() = user_id);

-- User rewards: Users can only see their own rewards
CREATE POLICY "Users can view own rewards" ON user_rewards
    FOR ALL USING (auth.uid() = user_id);

-- Support conversations: Users can only see their own conversations
CREATE POLICY "Users can view own support conversations" ON support_conversations
    FOR ALL USING (auth.uid() = user_id);

-- Support messages: Users can only see messages from their conversations
CREATE POLICY "Users can view own support messages" ON support_messages
    FOR ALL USING (
        auth.uid() = sender_id OR 
        EXISTS (
            SELECT 1 FROM support_conversations 
            WHERE support_conversations.id = support_messages.conversation_id 
            AND support_conversations.user_id = auth.uid()
        )
    );

-- Booking requests: Users can only see their own requests
CREATE POLICY "Users can view own booking requests" ON booking_requests
    FOR ALL USING (auth.uid() = user_id);

-- Custom habits: Users can only see their own habits
CREATE POLICY "Users can view own custom habits" ON custom_habits
    FOR ALL USING (auth.uid() = user_id);

-- Rest timers: Users can only see their own timers
CREATE POLICY "Users can view own rest timers" ON rest_timers
    FOR ALL USING (auth.uid() = user_id);

-- RPE history: Users can only see their own RPE history
CREATE POLICY "Users can view own RPE history" ON rpe_history
    FOR ALL USING (auth.uid() = user_id);

-- Static starts: Users can only see their own static starts
CREATE POLICY "Users can view own static starts" ON static_starts
    FOR ALL USING (auth.uid() = user_id);

-- Training journal: Users can only see their own journal entries
CREATE POLICY "Users can view own training journal" ON training_journal
    FOR ALL USING (auth.uid() = user_id);

-- Challenge logs: Users can only see their own challenge logs
CREATE POLICY "Users can view own challenge logs" ON challenge_logs
    FOR ALL USING (auth.uid() = user_id);

-- Public/read-only tables (allow all authenticated users to read)
CREATE POLICY "Authenticated users can read exercises" ON exercises
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read workout templates" ON workout_templates
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read template days" ON template_days
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read template items" ON template_items
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read timezones" ON timezones
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read challenges master" ON challenges_master
    FOR SELECT USING (auth.role() = 'authenticated');

-- Admin-only tables (only admins can access)
CREATE POLICY "Only admins can access user roles" ON user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin'
        )
    );

-- Views policies (read-only for authenticated users)
CREATE POLICY "Authenticated users can read access matrix" ON v_access_matrix
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read client programs admin" ON v_client_programs_admin
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read program analytics" ON v_program_analytics
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read program progress" ON v_program_progress
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read session summary" ON v_session_summary
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read static status" ON v_static_status
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read user entitlement" ON v_user_entitlement
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read user weekly" ON v_user_weekly
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read userprogress with day" ON v_userprogress_with_day
    FOR SELECT USING (auth.role() = 'authenticated');

-- Backup tables (users can only see their own data)
CREATE POLICY "Users can view own backup data" ON programday_backup
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own set logs backup" ON set_logs_backup
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own userprogress backup" ON userprogress_backup
    FOR ALL USING (auth.uid() = user_id);

-- Legacy programday table
CREATE POLICY "Users can view own programday data" ON programday
    FOR ALL USING (auth.uid() = user_id);

-- Articles (public read, admin write)
CREATE POLICY "Anyone can read published articles" ON articles
    FOR SELECT USING (published = true);

CREATE POLICY "Only admins can modify articles" ON articles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin'
        )
    );

-- Access overrides (admin only)
CREATE POLICY "Only admins can access overrides" ON access_overrides
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin'
        )
    );
