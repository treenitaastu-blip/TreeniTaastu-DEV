-- Drop and recreate v_session_summary view with proper volume calculation
DROP VIEW IF EXISTS v_session_summary;

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