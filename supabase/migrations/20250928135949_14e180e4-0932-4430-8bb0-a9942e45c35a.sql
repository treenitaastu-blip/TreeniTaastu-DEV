-- Final fix for any remaining Security Definer issues and database optimization

-- Ensure all views are recreated without SECURITY DEFINER properties
DROP VIEW IF EXISTS public.v_access_matrix CASCADE;
DROP VIEW IF EXISTS public.v_program_analytics CASCADE;
DROP VIEW IF EXISTS public.v_client_programs_admin CASCADE;
DROP VIEW IF EXISTS public.v_program_progress CASCADE;
DROP VIEW IF EXISTS public.v_session_summary CASCADE;

-- Recreate all views with explicit SECURITY INVOKER (default, but making it explicit)
CREATE VIEW public.v_access_matrix 
WITH (security_invoker=true)
AS
WITH admin_users AS (
  SELECT p.id as user_id, true as is_admin, 'profile_admin' as reason
  FROM profiles p 
  WHERE p.role = 'admin'
  
  UNION
  
  SELECT ur.user_id, true as is_admin, 'user_roles_admin' as reason
  FROM user_roles ur 
  WHERE ur.role = 'admin'
  
  UNION
  
  SELECT ao.user_id, true as is_admin, 'access_override' as reason
  FROM access_overrides ao
  WHERE ao.expires_at IS NULL OR ao.expires_at > now()
),
entitlement_access AS (
  SELECT 
    ue.user_id,
    bool_or(
      CASE WHEN ue.product = 'static' 
           AND NOT ue.paused 
           AND (
             (ue.status = 'active' AND (ue.expires_at IS NULL OR ue.expires_at > now())) OR
             (ue.status = 'trialing' AND ue.trial_ends_at IS NOT NULL AND ue.trial_ends_at > now())
           )
      THEN true ELSE false END
    ) as can_static,
    bool_or(
      CASE WHEN ue.product = 'pt' 
           AND NOT ue.paused 
           AND (
             (ue.status = 'active' AND (ue.expires_at IS NULL OR ue.expires_at > now())) OR
             (ue.status = 'trialing' AND ue.trial_ends_at IS NOT NULL AND ue.trial_ends_at > now())
           )
      THEN true ELSE false END
    ) as can_pt
  FROM user_entitlements ue
  GROUP BY ue.user_id
),
all_users AS (
  SELECT p.id as user_id FROM profiles p
)
SELECT 
  u.user_id,
  COALESCE(a.is_admin, false) as is_admin,
  COALESCE(e.can_static, false) OR COALESCE(a.is_admin, false) as can_static,
  COALESCE(e.can_pt, false) OR COALESCE(a.is_admin, false) as can_pt,
  COALESCE(a.reason, 'database_view') as reason
FROM all_users u
LEFT JOIN admin_users a ON a.user_id = u.user_id
LEFT JOIN entitlement_access e ON e.user_id = u.user_id;

-- Recreate v_client_programs_admin
CREATE VIEW public.v_client_programs_admin 
WITH (security_invoker=true)
AS
SELECT 
  cp.id,
  cp.template_id,
  cp.assigned_to,
  cp.assigned_by,
  cp.start_date,
  cp.is_active,
  cp.title_override,
  cp.duration_weeks,
  cp.auto_progression_enabled,
  cp.status,
  cp.completed_at,
  cp.inserted_at,
  wt.title as template_title,
  wt.goal as template_goal,
  p_assigned.email as assigned_to_email,
  p_assigned_by.email as assigned_by_email
FROM client_programs cp
LEFT JOIN workout_templates wt ON wt.id = cp.template_id
LEFT JOIN profiles p_assigned ON p_assigned.id = cp.assigned_to
LEFT JOIN profiles p_assigned_by ON p_assigned_by.id = cp.assigned_by;

-- Recreate v_program_progress
CREATE VIEW public.v_program_progress 
WITH (security_invoker=true)
AS
WITH program_sessions AS (
  SELECT 
    cp.id as program_id,
    cp.assigned_to as user_id,
    cp.start_date,
    cp.duration_weeks,
    cp.auto_progression_enabled,
    cp.status,
    cp.completed_at,
    COUNT(DISTINCT ws.id) as total_sessions,
    COUNT(DISTINCT CASE WHEN ws.ended_at IS NOT NULL THEN ws.id END) as completed_sessions,
    COUNT(DISTINCT cd.id) as total_days,
    EXTRACT(EPOCH FROM (NOW() - cp.start_date)) / (7 * 24 * 3600) as weeks_elapsed
  FROM client_programs cp
  LEFT JOIN client_days cd ON cd.client_program_id = cp.id  
  LEFT JOIN workout_sessions ws ON ws.client_program_id = cp.id
  WHERE cp.start_date IS NOT NULL
  GROUP BY cp.id, cp.assigned_to, cp.start_date, cp.duration_weeks, cp.auto_progression_enabled, cp.status, cp.completed_at
)
SELECT 
  program_id,
  user_id,
  start_date,
  duration_weeks,
  auto_progression_enabled,
  status,
  completed_at,
  weeks_elapsed,
  CASE 
    WHEN total_sessions = 0 OR total_days = 0 THEN 0
    ELSE ROUND((completed_sessions::numeric / total_days::numeric) * 100, 0)
  END as progress_percentage,
  CASE 
    WHEN weeks_elapsed >= duration_weeks THEN true
    ELSE false
  END as is_due_for_completion
FROM program_sessions;

-- Recreate v_program_analytics
CREATE VIEW public.v_program_analytics 
WITH (security_invoker=true)
AS
WITH program_stats AS (
  SELECT 
    cp.id as program_id,
    cp.title_override,
    cp.start_date,
    cp.duration_weeks,
    COUNT(DISTINCT cd.id) as total_days,
    COUNT(DISTINCT ws.id) as total_sessions,
    COUNT(DISTINCT CASE WHEN ws.ended_at IS NOT NULL THEN ws.id END) as completed_sessions,
    AVG(CASE WHEN ws.ended_at IS NOT NULL THEN ws.duration_minutes END) as avg_session_duration,
    COUNT(DISTINCT ws.user_id) as unique_users,
    MIN(ws.started_at) as first_session,
    MAX(ws.started_at) as last_session
  FROM client_programs cp
  LEFT JOIN client_days cd ON cd.client_program_id = cp.id
  LEFT JOIN workout_sessions ws ON ws.client_program_id = cp.id
  GROUP BY cp.id, cp.title_override, cp.start_date, cp.duration_weeks
),
dropoff_analysis AS (
  SELECT 
    1 as most_common_dropoff_day
)
SELECT 
  ps.*,
  CASE 
    WHEN ps.total_sessions = 0 THEN 0
    ELSE ROUND((ps.completed_sessions::numeric / ps.total_sessions::numeric) * 100, 1)
  END as completion_rate,
  da.most_common_dropoff_day
FROM program_stats ps
CROSS JOIN dropoff_analysis da;

-- Recreate v_session_summary  
CREATE VIEW public.v_session_summary
WITH (security_invoker=true)
AS
SELECT 
  ws.id as session_id,
  ws.user_id,
  ws.client_program_id,
  ws.client_day_id,
  ws.started_at,
  ws.ended_at,
  ws.duration_minutes,
  COUNT(DISTINCT sl.id) as total_sets_completed,
  AVG(en.rpe) as avg_rpe,
  cd.title as day_title,
  cp.title_override as program_title
FROM workout_sessions ws
LEFT JOIN set_logs sl ON sl.session_id = ws.id
LEFT JOIN exercise_notes en ON en.session_id = ws.id
LEFT JOIN client_days cd ON cd.id = ws.client_day_id
LEFT JOIN client_programs cp ON cp.id = ws.client_program_id
GROUP BY ws.id, ws.user_id, ws.client_program_id, ws.client_day_id, ws.started_at, ws.ended_at, ws.duration_minutes, cd.title, cp.title_override;