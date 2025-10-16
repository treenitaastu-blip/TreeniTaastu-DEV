-- Fix program deletion to handle user_streaks foreign key constraint
CREATE OR REPLACE FUNCTION public.admin_delete_client_program_cascade(p_program_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_sessions int := 0;
    v_deleted_items int := 0;
    v_deleted_days int := 0;
    v_deleted_streaks int := 0;
BEGIN
    -- Only admins can delete programs
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'forbidden: admin access required';
    END IF;

    -- Delete user_streaks first to avoid foreign key constraint issues
    WITH deleted_streaks AS (
        DELETE FROM user_streaks 
        WHERE user_id IN (
            SELECT assigned_to FROM client_programs WHERE id = p_program_id
        )
        RETURNING id
    )
    SELECT count(*) INTO v_deleted_streaks FROM deleted_streaks;

    -- Delete workout sessions (this will cascade to set_logs, rest_timers)
    WITH deleted_sessions AS (
        DELETE FROM workout_sessions 
        WHERE client_program_id = p_program_id 
        RETURNING id
    )
    SELECT count(*) INTO v_deleted_sessions FROM deleted_sessions;

    -- Delete client structure
    WITH deleted_items AS (
        DELETE FROM client_items 
        WHERE client_day_id IN (
            SELECT id FROM client_days WHERE client_program_id = p_program_id
        )
        RETURNING id
    )
    SELECT count(*) INTO v_deleted_items FROM deleted_items;

    WITH deleted_days AS (
        DELETE FROM client_days 
        WHERE client_program_id = p_program_id 
        RETURNING id
    )
    SELECT count(*) INTO v_deleted_days FROM deleted_days;

    -- Finally delete the program
    DELETE FROM client_programs WHERE id = p_program_id;

    RETURN jsonb_build_object(
        'success', true,
        'deleted_sessions', v_deleted_sessions,
        'deleted_days', v_deleted_days,
        'deleted_items', v_deleted_items,
        'deleted_streaks', v_deleted_streaks
    );
END;
$$;

