-- Fix remaining SECURITY DEFINER views

-- Check what views still have SECURITY DEFINER
SELECT schemaname, viewname, definition 
FROM pg_views 
WHERE schemaname = 'public' 
  AND definition LIKE '%SECURITY DEFINER%';

-- Find and fix remaining security definer views
DROP VIEW IF EXISTS v_client_programs_admin CASCADE;
DROP VIEW IF EXISTS v_program_progress CASCADE;

-- Recreate v_client_programs_admin without SECURITY DEFINER
CREATE VIEW v_client_programs_admin AS
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

-- Recreate v_program_progress without SECURITY DEFINER
CREATE VIEW v_program_progress AS
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