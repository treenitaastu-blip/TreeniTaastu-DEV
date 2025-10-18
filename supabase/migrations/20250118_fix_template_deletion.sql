-- Fix template deletion by creating a simpler function that doesn't rely on is_admin()
CREATE OR REPLACE FUNCTION public.delete_template_simple(p_template_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_programs int := 0;
    v_deleted_days int := 0;
    v_deleted_items int := 0;
BEGIN
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_template_simple(uuid) TO authenticated;
