-- Drop both views that depend on each other
DROP VIEW IF EXISTS v_user_weekly CASCADE;
DROP VIEW IF EXISTS v_session_summary CASCADE;

-- Recreate v_session_summary with proper volume calculation
CREATE VIEW v_session_summary AS
SELECT 
    ws.id as session_id,
    ws.user_id,
    ws.started_at,
    ws.ended_at,
    ws.duration_minutes,
    COALESCE(sl.total_reps, 0) as total_reps,
    COALESCE(sl.total_volume_kg, 0) as total_volume_kg,
    COALESCE(sl.exercises_completed, 0) as exercises_completed,
    COALESCE(sl.sets_completed, 0) as sets_completed,
    sl.avg_rpe
FROM workout_sessions ws
LEFT JOIN (
    SELECT 
        session_id,
        SUM(COALESCE(reps_done, 0)) as total_reps,
        -- Volume calculation: sum of (weight * reps) for each set
        SUM(COALESCE(weight_kg_done, 0) * COALESCE(reps_done, 0)) as total_volume_kg,
        COUNT(DISTINCT client_item_id) as exercises_completed,
        COUNT(*) as sets_completed,
        -- Average RPE from exercise_notes for this session
        (SELECT AVG(rpe) FROM exercise_notes en WHERE en.session_id = sl.session_id AND rpe IS NOT NULL) as avg_rpe
    FROM set_logs sl
    GROUP BY session_id
) sl ON ws.id = sl.session_id;

-- Recreate v_user_weekly with proper volume calculation
CREATE VIEW v_user_weekly AS
SELECT 
    vss.user_id,
    date_trunc('week', vss.started_at AT TIME ZONE 'Europe/Tallinn') AT TIME ZONE 'Europe/Tallinn' as week_start,
    COUNT(*) FILTER (WHERE vss.ended_at IS NOT NULL) as sessions_count,
    SUM(vss.sets_completed) as weekly_sets,
    SUM(vss.total_reps) as weekly_reps,
    SUM(vss.total_volume_kg) as weekly_volume,
    AVG(vss.avg_rpe) FILTER (WHERE vss.avg_rpe IS NOT NULL) as weekly_avg_rpe,
    MAX(vss.ended_at) as last_session_date
FROM v_session_summary vss
WHERE vss.started_at >= CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY vss.user_id, date_trunc('week', vss.started_at AT TIME ZONE 'Europe/Tallinn');