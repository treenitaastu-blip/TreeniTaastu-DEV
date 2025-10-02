-- Create analytics views for comprehensive program metrics

-- Session Summary View
CREATE OR REPLACE VIEW v_session_summary AS
SELECT 
  ws.user_id,
  ws.id as session_id,
  ws.started_at,
  ws.ended_at,
  ws.duration_minutes,
  COUNT(sl.id) as sets_completed,
  AVG(en.rpe) as avg_rpe,
  COUNT(DISTINCT sl.client_item_id) as exercises_completed,
  SUM(sl.reps_done) as total_reps,
  SUM(sl.weight_kg_done * sl.reps_done) as total_volume_kg
FROM workout_sessions ws
LEFT JOIN set_logs sl ON ws.id = sl.session_id
LEFT JOIN exercise_notes en ON ws.id = en.session_id AND sl.client_item_id = en.client_item_id
WHERE ws.ended_at IS NOT NULL
GROUP BY ws.user_id, ws.id, ws.started_at, ws.ended_at, ws.duration_minutes;

-- User Weekly Summary View  
CREATE OR REPLACE VIEW v_user_weekly AS
SELECT 
  user_id,
  DATE_TRUNC('week', started_at) as week_start,
  COUNT(*) as sessions_count,
  AVG(avg_rpe) as weekly_avg_rpe,
  SUM(sets_completed) as weekly_sets,
  SUM(total_reps) as weekly_reps,
  SUM(total_volume_kg) as weekly_volume,
  MAX(started_at) as last_session_date
FROM v_session_summary
GROUP BY user_id, DATE_TRUNC('week', started_at)
ORDER BY user_id, week_start DESC;

-- Program Completion Analytics
CREATE OR REPLACE VIEW v_program_analytics AS
SELECT 
  COUNT(DISTINCT up.user_id) as total_users,
  COUNT(up.id) as total_completions,
  COUNT(DISTINCT up.programday_id) as unique_days_completed,
  AVG(CASE WHEN up.user_id IN (
    SELECT user_id FROM userprogress GROUP BY user_id HAVING COUNT(*) >= 20
  ) THEN 1.0 ELSE 0.0 END) as completion_rate,
  
  -- Drop-off analysis: find most common last completed day
  (SELECT pd.day 
   FROM (
     SELECT up2.programday_id, COUNT(*) as completions
     FROM userprogress up2
     WHERE up2.user_id NOT IN (
       SELECT user_id FROM userprogress GROUP BY user_id HAVING COUNT(*) >= 20
     )
     GROUP BY up2.programday_id
     ORDER BY completions DESC
     LIMIT 1
   ) last_days
   JOIN programday pd ON pd.id = last_days.programday_id
  ) as most_common_dropoff_day
  
FROM userprogress up;