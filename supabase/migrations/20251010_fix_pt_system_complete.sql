-- Fix Personal Training System - Complete Implementation
-- This migration creates the missing assign_template_to_user_v2 function
-- and fixes the PT system to be fully functional

-- 1. Create the missing assign_template_to_user_v2 function
CREATE OR REPLACE FUNCTION public.assign_template_to_user_v2(
    p_template_id uuid,
    p_target_email text,
    p_start_date date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_user_id uuid;
    v_program_id uuid;
    v_template_day RECORD;
    v_template_item RECORD;
    v_client_day_id uuid;
    v_days_created integer := 0;
    v_items_created integer := 0;
BEGIN
    -- Only admins can assign templates
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'forbidden: admin access required';
    END IF;

    -- Find the target user by email
    SELECT id INTO v_target_user_id
    FROM profiles
    WHERE email = p_target_email
    LIMIT 1;

    IF v_target_user_id IS NULL THEN
        RAISE EXCEPTION 'user not found: %', p_target_email;
    END IF;

    -- Check if template exists and is active
    IF NOT EXISTS (
        SELECT 1 FROM workout_templates 
        WHERE id = p_template_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'template not found or inactive: %', p_template_id;
    END IF;

    -- Create the client program
    INSERT INTO client_programs (
        template_id,
        assigned_to,
        assigned_by,
        start_date,
        is_active,
        status
    ) VALUES (
        p_template_id,
        v_target_user_id,
        auth.uid(),
        COALESCE(p_start_date, CURRENT_DATE),
        true,
        'active'
    ) RETURNING id INTO v_program_id;

    -- Copy template days to client days
    FOR v_template_day IN
        SELECT id, day_order, title, note
        FROM template_days
        WHERE template_id = p_template_id
        ORDER BY day_order
    LOOP
        -- Create client day
        INSERT INTO client_days (
            client_program_id,
            day_order,
            title,
            note
        ) VALUES (
            v_program_id,
            v_template_day.day_order,
            v_template_day.title,
            v_template_day.note
        ) RETURNING id INTO v_client_day_id;

        v_days_created := v_days_created + 1;

        -- Copy template items to client items
        FOR v_template_item IN
            SELECT 
                exercise_name,
                sets,
                reps,
                seconds,
                weight_kg,
                rest_seconds,
                coach_notes,
                video_url,
                order_in_day
            FROM template_items
            WHERE template_day_id = v_template_day.id
            ORDER BY order_in_day
        LOOP
            -- Create client item
            INSERT INTO client_items (
                client_day_id,
                exercise_name,
                base_exercise_name,
                sets,
                reps,
                seconds,
                weight_kg,
                rest_seconds,
                coach_notes,
                video_url,
                order_in_day
            ) VALUES (
                v_client_day_id,
                v_template_item.exercise_name,
                v_template_item.exercise_name,
                v_template_item.sets,
                v_template_item.reps,
                v_template_item.seconds,
                v_template_item.weight_kg,
                v_template_item.rest_seconds,
                v_template_item.coach_notes,
                v_template_item.video_url,
                v_template_item.order_in_day
            );

            v_items_created := v_items_created + 1;
        END LOOP;
    END LOOP;

    -- Verify the program was created with content
    IF v_days_created = 0 THEN
        -- Rollback if no days were created
        DELETE FROM client_programs WHERE id = v_program_id;
        RAISE EXCEPTION 'template has no days - program creation failed';
    END IF;

    -- Log the successful assignment
    INSERT INTO user_analytics_events (
        user_id,
        event_type,
        event_data
    ) VALUES (
        auth.uid(),
        'program_assignment',
        jsonb_build_object(
            'template_id', p_template_id,
            'target_user', v_target_user_id,
            'program_id', v_program_id,
            'days_created', v_days_created,
            'items_created', v_items_created
        )
    );

    RETURN v_program_id;
END;
$$;

-- 2. Create function to update program content (for admin editing)
CREATE OR REPLACE FUNCTION public.update_client_program_content(
    p_program_id uuid,
    p_day_id uuid,
    p_exercise_name text,
    p_sets integer,
    p_reps text,
    p_weight_kg numeric DEFAULT NULL,
    p_rest_seconds integer DEFAULT NULL,
    p_coach_notes text DEFAULT NULL,
    p_video_url text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_client_item_id uuid;
BEGIN
    -- Only admins can update program content
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'forbidden: admin access required';
    END IF;

    -- Verify the program exists and admin has access
    IF NOT EXISTS (
        SELECT 1 FROM client_programs cp
        WHERE cp.id = p_program_id
        AND (cp.assigned_by = auth.uid() OR is_admin())
    ) THEN
        RAISE EXCEPTION 'program not found or access denied';
    END IF;

    -- Verify the day belongs to the program
    IF NOT EXISTS (
        SELECT 1 FROM client_days cd
        WHERE cd.id = p_day_id AND cd.client_program_id = p_program_id
    ) THEN
        RAISE EXCEPTION 'day not found in program';
    END IF;

    -- Update or create the client item
    INSERT INTO client_items (
        client_day_id,
        exercise_name,
        sets,
        reps,
        weight_kg,
        rest_seconds,
        coach_notes,
        video_url,
        order_in_day
    ) VALUES (
        p_day_id,
        p_exercise_name,
        p_sets,
        p_reps,
        p_weight_kg,
        p_rest_seconds,
        p_coach_notes,
        p_video_url,
        1
    )
    ON CONFLICT (client_day_id, exercise_name, order_in_day)
    DO UPDATE SET
        sets = EXCLUDED.sets,
        reps = EXCLUDED.reps,
        weight_kg = EXCLUDED.weight_kg,
        rest_seconds = EXCLUDED.rest_seconds,
        coach_notes = EXCLUDED.coach_notes,
        video_url = EXCLUDED.video_url;

    RETURN true;
END;
$$;

-- 3. Create function to add new exercise to a program day
CREATE OR REPLACE FUNCTION public.add_exercise_to_program_day(
    p_program_id uuid,
    p_day_id uuid,
    p_exercise_name text,
    p_sets integer,
    p_reps text,
    p_weight_kg numeric DEFAULT NULL,
    p_rest_seconds integer DEFAULT NULL,
    p_coach_notes text DEFAULT NULL,
    p_video_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_client_item_id uuid;
    v_max_order integer;
BEGIN
    -- Only admins can add exercises
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'forbidden: admin access required';
    END IF;

    -- Verify the program exists and admin has access
    IF NOT EXISTS (
        SELECT 1 FROM client_programs cp
        WHERE cp.id = p_program_id
        AND (cp.assigned_by = auth.uid() OR is_admin())
    ) THEN
        RAISE EXCEPTION 'program not found or access denied';
    END IF;

    -- Verify the day belongs to the program
    IF NOT EXISTS (
        SELECT 1 FROM client_days cd
        WHERE cd.id = p_day_id AND cd.client_program_id = p_program_id
    ) THEN
        RAISE EXCEPTION 'day not found in program';
    END IF;

    -- Get the next order number
    SELECT COALESCE(MAX(order_in_day), 0) + 1 INTO v_max_order
    FROM client_items
    WHERE client_day_id = p_day_id;

    -- Add the new exercise
    INSERT INTO client_items (
        client_day_id,
        exercise_name,
        sets,
        reps,
        weight_kg,
        rest_seconds,
        coach_notes,
        video_url,
        order_in_day
    ) VALUES (
        p_day_id,
        p_exercise_name,
        p_sets,
        p_reps,
        p_weight_kg,
        p_rest_seconds,
        p_coach_notes,
        p_video_url,
        v_max_order
    ) RETURNING id INTO v_client_item_id;

    RETURN v_client_item_id;
END;
$$;

-- 4. Create function to remove exercise from program day
CREATE OR REPLACE FUNCTION public.remove_exercise_from_program_day(
    p_program_id uuid,
    p_item_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only admins can remove exercises
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'forbidden: admin access required';
    END IF;

    -- Verify the item belongs to a program the admin can access
    IF NOT EXISTS (
        SELECT 1 FROM client_items ci
        JOIN client_days cd ON cd.id = ci.client_day_id
        JOIN client_programs cp ON cp.id = cd.client_program_id
        WHERE ci.id = p_item_id
        AND (cp.assigned_by = auth.uid() OR is_admin())
    ) THEN
        RAISE EXCEPTION 'item not found or access denied';
    END IF;

    -- Remove the item
    DELETE FROM client_items WHERE id = p_item_id;

    RETURN true;
END;
$$;

-- 5. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.assign_template_to_user_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_client_program_content TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_exercise_to_program_day TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_exercise_from_program_day TO authenticated;

-- 6. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_client_programs_assigned_to ON public.client_programs(assigned_to);
CREATE INDEX IF NOT EXISTS idx_client_programs_assigned_by ON public.client_programs(assigned_by);
CREATE INDEX IF NOT EXISTS idx_client_days_program_id ON public.client_days(client_program_id);
CREATE INDEX IF NOT EXISTS idx_client_items_day_id ON public.client_items(client_day_id);

-- 7. Update statistics
ANALYZE public.client_programs;
ANALYZE public.client_days;
ANALYZE public.client_items;




