-- Optimize Personal Training System Queries
-- This migration adds optimized database functions and indexes

-- 1. Create batch update function for exercises
CREATE OR REPLACE FUNCTION public.batch_update_exercises(updates jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    update_item jsonb;
    result jsonb := '{"success": true, "updated_count": 0}';
BEGIN
    -- Loop through each update
    FOR update_item IN SELECT * FROM jsonb_array_elements(updates)
    LOOP
        -- Update the exercise
        UPDATE client_items 
        SET 
            weight_kg = COALESCE((update_item->>'weight_kg')::numeric, weight_kg),
            reps = COALESCE(update_item->>'reps', reps),
            sets = COALESCE((update_item->>'sets')::integer, sets)
        WHERE id = (update_item->>'id')::uuid;
        
        -- Increment counter
        result := jsonb_set(result, '{updated_count}', to_jsonb((result->>'updated_count')::integer + 1));
    END LOOP;
    
    RETURN result;
END;
$$;

-- 2. Create optimized view for client programs with all related data
CREATE OR REPLACE VIEW public.v_client_programs_optimized AS
SELECT 
    cp.id,
    cp.title_override,
    cp.start_date,
    cp.is_active,
    cp.assigned_to,
    cp.template_id,
    cp.inserted_at,
    p.email as user_email,
    p.full_name as user_name,
    wt.title as template_title,
    wt.goal as template_goal,
    COUNT(cd.id) as day_count,
    COUNT(ci.id) as exercise_count
FROM client_programs cp
LEFT JOIN profiles p ON p.id = cp.assigned_to
LEFT JOIN workout_templates wt ON wt.id = cp.template_id
LEFT JOIN client_days cd ON cd.client_program_id = cp.id
LEFT JOIN client_items ci ON ci.client_day_id = cd.id
GROUP BY cp.id, p.email, p.full_name, wt.title, wt.goal;

-- 3. Create optimized view for workout sessions with statistics
CREATE OR REPLACE VIEW public.v_workout_sessions_optimized AS
SELECT 
    ws.id,
    ws.user_id,
    ws.client_program_id,
    ws.started_at,
    ws.ended_at,
    ws.duration_minutes,
    ws.avg_rpe,
    cp.title_override as program_title,
    cd.title as day_title,
    cd.day_order,
    COUNT(sl.id) as sets_completed,
    SUM(sl.weight_kg_done * sl.reps_done) as total_volume_kg
FROM workout_sessions ws
LEFT JOIN client_programs cp ON cp.id = ws.client_program_id
LEFT JOIN client_days cd ON cd.client_program_id = ws.client_program_id
LEFT JOIN set_logs sl ON sl.session_id = ws.id
GROUP BY ws.id, cp.title_override, cd.title, cd.day_order;

-- 4. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_client_programs_assigned_to_active ON client_programs(assigned_to, is_active);
CREATE INDEX IF NOT EXISTS idx_client_programs_template_id ON client_programs(template_id);
CREATE INDEX IF NOT EXISTS idx_client_days_program_order ON client_days(client_program_id, day_order);
CREATE INDEX IF NOT EXISTS idx_client_items_day_order ON client_items(client_day_id, order_in_day);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date ON workout_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_set_logs_session ON set_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_exercise_alternatives_primary ON exercise_alternatives(primary_exercise_id);
CREATE INDEX IF NOT EXISTS idx_template_alternatives_primary ON template_alternatives(primary_exercise_id);

-- 5. Create function to get PT system statistics efficiently
CREATE OR REPLACE FUNCTION public.get_pt_system_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'total_programs', COUNT(*),
        'active_programs', COUNT(*) FILTER (WHERE is_active IS NOT FALSE),
        'total_clients', COUNT(DISTINCT assigned_to),
        'completed_sessions', (
            SELECT COUNT(*) 
            FROM workout_sessions 
            WHERE ended_at IS NOT NULL
        )
    )
    INTO result
    FROM client_programs;
    
    RETURN result;
END;
$$;

-- 6. Create function to get user's PT statistics efficiently
CREATE OR REPLACE FUNCTION public.get_user_pt_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'total_programs', COUNT(*),
        'active_programs', COUNT(*) FILTER (WHERE is_active IS NOT FALSE),
        'completed_sessions', (
            SELECT COUNT(*) 
            FROM workout_sessions 
            WHERE user_id = p_user_id AND ended_at IS NOT NULL
        ),
        'total_volume_kg', (
            SELECT COALESCE(SUM(sl.weight_kg_done * sl.reps_done), 0)
            FROM workout_sessions ws
            JOIN set_logs sl ON sl.session_id = ws.id
            WHERE ws.user_id = p_user_id
        ),
        'avg_rpe', (
            SELECT COALESCE(AVG(avg_rpe), 0)
            FROM workout_sessions 
            WHERE user_id = p_user_id AND avg_rpe IS NOT NULL
        )
    )
    INTO result
    FROM client_programs
    WHERE assigned_to = p_user_id;
    
    RETURN result;
END;
$$;

-- 7. Create function to get template with all related data
CREATE OR REPLACE FUNCTION public.get_template_with_data(p_template_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'template', row_to_json(wt),
        'days', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'day', row_to_json(td),
                    'items', (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'item', row_to_json(ti),
                                'alternatives', (
                                    SELECT jsonb_agg(row_to_json(ta))
                                    FROM template_alternatives ta
                                    WHERE ta.primary_exercise_id = ti.id
                                )
                            )
                        )
                        FROM template_items ti
                        WHERE ti.template_day_id = td.id
                        ORDER BY ti.order_in_day
                    )
                )
            )
            FROM template_days td
            WHERE td.template_id = p_template_id
            ORDER BY td.day_order
        )
    )
    INTO result
    FROM workout_templates wt
    WHERE wt.id = p_template_id;
    
    RETURN result;
END;
$$;

-- 8. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.batch_update_exercises(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pt_system_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_pt_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_template_with_data(uuid) TO authenticated;

-- 9. Grant access to optimized views
GRANT SELECT ON public.v_client_programs_optimized TO authenticated;
GRANT SELECT ON public.v_workout_sessions_optimized TO authenticated;

-- 10. Update table statistics for better query planning
ANALYZE client_programs;
ANALYZE client_days;
ANALYZE client_items;
ANALYZE workout_sessions;
ANALYZE set_logs;
ANALYZE exercise_alternatives;
ANALYZE template_alternatives;
