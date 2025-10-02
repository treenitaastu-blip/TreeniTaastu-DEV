-- Create a unified function to delete templates with proper cascade
CREATE OR REPLACE FUNCTION public.admin_delete_template_cascade(p_template_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_programs int := 0;
    v_deleted_days int := 0;
    v_deleted_items int := 0;
BEGIN
    -- Only admins can delete templates
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'forbidden: admin access required';
    END IF;

    -- Delete all client programs using this template and their related data
    WITH deleted_programs AS (
        DELETE FROM client_programs 
        WHERE template_id = p_template_id 
        RETURNING id
    )
    SELECT count(*) INTO v_deleted_programs FROM deleted_programs;

    -- Delete template structure
    WITH deleted_items AS (
        DELETE FROM template_items 
        WHERE template_day_id IN (
            SELECT id FROM template_days WHERE template_id = p_template_id
        )
        RETURNING id
    )
    SELECT count(*) INTO v_deleted_items FROM deleted_items;

    WITH deleted_days AS (
        DELETE FROM template_days 
        WHERE template_id = p_template_id 
        RETURNING id
    )
    SELECT count(*) INTO v_deleted_days FROM deleted_days;

    -- Finally delete the template
    DELETE FROM workout_templates WHERE id = p_template_id;

    RETURN jsonb_build_object(
        'success', true,
        'deleted_programs', v_deleted_programs,
        'deleted_days', v_deleted_days,
        'deleted_items', v_deleted_items
    );
END;
$$;

-- Create a unified function to delete client programs with proper cascade
CREATE OR REPLACE FUNCTION public.admin_delete_client_program_cascade(p_program_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_sessions int := 0;
    v_deleted_items int := 0;
    v_deleted_days int := 0;
BEGIN
    -- Only admins can delete programs
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'forbidden: admin access required';
    END IF;

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
        'deleted_items', v_deleted_items
    );
END;
$$;