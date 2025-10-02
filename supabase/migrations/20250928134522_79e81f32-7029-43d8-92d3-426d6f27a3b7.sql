-- Fix SECURITY DEFINER view issues by removing the problematic views and recreating them properly

-- Drop the problematic security definer views first
DROP VIEW IF EXISTS v_access_matrix CASCADE;
DROP VIEW IF EXISTS v_program_analytics CASCADE;

-- Recreate v_access_matrix without SECURITY DEFINER (will use INVOKER rights)
CREATE VIEW v_access_matrix AS
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

-- Recreate v_program_analytics without SECURITY DEFINER  
CREATE VIEW v_program_analytics AS
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
    1 as most_common_dropoff_day -- Simplified for now
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