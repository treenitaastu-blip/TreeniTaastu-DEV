-- Create a complete personal training program in one transaction.
-- Any validation or insert error aborts the whole RPC, so admins never end up
-- with orphaned templates or half-created client programs.

CREATE OR REPLACE FUNCTION public.create_personal_program(
  p_target_user_id uuid,
  p_title text,
  p_start_date date,
  p_duration_weeks integer,
  p_auto_progression_enabled boolean,
  p_training_days jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id uuid;
  v_program_id uuid;
  v_template_day_id uuid;
  v_client_day_id uuid;
  v_template_item_id uuid;
  v_client_item_id uuid;
  v_day jsonb;
  v_exercise jsonb;
  v_alternative jsonb;
  v_day_number integer;
  v_order integer;
  v_title text := NULLIF(btrim(p_title), '');
  v_exercise_name text;
  v_sets integer;
  v_reps text;
  v_seconds integer;
  v_weight numeric;
  v_rest_seconds integer;
  v_is_unilateral boolean;
  v_reps_per_side integer;
  v_total_reps integer;
BEGIN
  IF NOT public.is_admin_secure(auth.uid()) THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  IF p_target_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_target_user_id
  ) THEN
    RAISE EXCEPTION 'target user not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_start_date IS NULL THEN
    RAISE EXCEPTION 'start date is required' USING ERRCODE = '22023';
  END IF;

  IF p_duration_weeks < 1 OR p_duration_weeks > 52 THEN
    RAISE EXCEPTION 'duration must be between 1 and 52 weeks' USING ERRCODE = '22023';
  END IF;

  IF p_training_days IS NULL
     OR jsonb_typeof(p_training_days) <> 'array'
     OR jsonb_array_length(p_training_days) < 1
     OR jsonb_array_length(p_training_days) > 7 THEN
    RAISE EXCEPTION 'training days must contain between 1 and 7 days' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(v_title, email || ' personaalprogramm')
  INTO v_title
  FROM public.profiles
  WHERE id = p_target_user_id;

  INSERT INTO public.workout_templates(title, goal, is_active, created_by)
  VALUES (
    v_title,
    p_duration_weeks || ' nädala personaalprogramm (' || jsonb_array_length(p_training_days) || ' päeva nädalas)',
    true,
    auth.uid()
  )
  RETURNING id INTO v_template_id;

  INSERT INTO public.client_programs(
    template_id,
    assigned_to,
    assigned_by,
    user_id,
    title_override,
    start_date,
    duration_weeks,
    training_days_per_week,
    auto_progression_enabled,
    is_active,
    status
  )
  VALUES (
    v_template_id,
    p_target_user_id,
    auth.uid(),
    p_target_user_id,
    v_title,
    p_start_date,
    p_duration_weeks,
    jsonb_array_length(p_training_days),
    COALESCE(p_auto_progression_enabled, true),
    true,
    'active'
  )
  RETURNING id INTO v_program_id;

  FOR v_day IN SELECT value FROM jsonb_array_elements(p_training_days)
  LOOP
    v_day_number := COALESCE(NULLIF(v_day ->> 'day_number', '')::integer, 0);

    IF v_day_number < 1 THEN
      RAISE EXCEPTION 'invalid training day number' USING ERRCODE = '22023';
    END IF;

    IF jsonb_typeof(COALESCE(v_day -> 'exercises', '[]'::jsonb)) <> 'array'
       OR jsonb_array_length(COALESCE(v_day -> 'exercises', '[]'::jsonb)) = 0 THEN
      RAISE EXCEPTION 'training day % needs at least one exercise', v_day_number USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.template_days(template_id, day_order, title, note)
    VALUES (
      v_template_id,
      v_day_number,
      COALESCE(NULLIF(btrim(v_day ->> 'title'), ''), 'Päev ' || v_day_number),
      NULLIF(btrim(v_day ->> 'note'), '')
    )
    RETURNING id INTO v_template_day_id;

    INSERT INTO public.client_days(client_program_id, template_day_id, day_order, title, note)
    VALUES (
      v_program_id,
      v_template_day_id,
      v_day_number,
      COALESCE(NULLIF(btrim(v_day ->> 'title'), ''), 'Päev ' || v_day_number),
      NULLIF(btrim(v_day ->> 'note'), '')
    )
    RETURNING id INTO v_client_day_id;

    v_order := 0;
    FOR v_exercise IN
      SELECT value FROM jsonb_array_elements(v_day -> 'exercises')
    LOOP
      v_order := v_order + 1;
      v_exercise_name := NULLIF(btrim(v_exercise ->> 'exercise_name'), '');
      v_sets := COALESCE(NULLIF(v_exercise ->> 'sets', '')::integer, 0);
      v_reps := NULLIF(btrim(v_exercise ->> 'reps'), '');
      v_seconds := NULLIF(v_exercise ->> 'seconds', '')::integer;
      v_weight := NULLIF(v_exercise ->> 'weight_kg', '')::numeric;
      v_rest_seconds := NULLIF(v_exercise ->> 'rest_seconds', '')::integer;
      v_is_unilateral := COALESCE((v_exercise ->> 'is_unilateral')::boolean, false);
      v_reps_per_side := NULLIF(v_exercise ->> 'reps_per_side', '')::integer;
      v_total_reps := NULLIF(v_exercise ->> 'total_reps', '')::integer;

      IF v_exercise_name IS NULL THEN
        RAISE EXCEPTION 'exercise name is required on day %', v_day_number USING ERRCODE = '22023';
      END IF;

      IF v_sets < 1 OR v_sets > 50 THEN
        RAISE EXCEPTION 'exercise sets must be between 1 and 50' USING ERRCODE = '22023';
      END IF;

      IF v_seconds IS NULL AND v_reps IS NULL THEN
        RAISE EXCEPTION 'exercise reps or seconds are required' USING ERRCODE = '22023';
      END IF;

      IF v_seconds IS NOT NULL AND v_seconds < 1 THEN
        RAISE EXCEPTION 'exercise seconds must be positive' USING ERRCODE = '22023';
      END IF;

      INSERT INTO public.template_items(
        template_day_id,
        exercise_name,
        exercise_type,
        sets,
        reps,
        seconds,
        weight_kg,
        rest_seconds,
        coach_notes,
        video_url,
        order_in_day,
        is_unilateral,
        reps_per_side,
        total_reps
      )
      VALUES (
        v_template_day_id,
        v_exercise_name,
        COALESCE(NULLIF(v_exercise ->> 'exercise_type', ''), 'isolation'),
        v_sets,
        COALESCE(v_reps, ''),
        v_seconds,
        v_weight,
        v_rest_seconds,
        NULLIF(btrim(v_exercise ->> 'coach_notes'), ''),
        NULLIF(btrim(v_exercise ->> 'video_url'), ''),
        v_order,
        v_is_unilateral,
        v_reps_per_side,
        v_total_reps
      )
      RETURNING id INTO v_template_item_id;

      INSERT INTO public.client_items(
        client_day_id,
        exercise_name,
        base_exercise_name,
        exercise_type,
        sets,
        reps,
        seconds,
        weight_kg,
        rest_seconds,
        coach_notes,
        video_url,
        order_in_day,
        is_unilateral,
        reps_per_side,
        total_reps,
        user_id
      )
      VALUES (
        v_client_day_id,
        v_exercise_name,
        v_exercise_name,
        COALESCE(NULLIF(v_exercise ->> 'exercise_type', ''), 'isolation'),
        v_sets,
        COALESCE(v_reps, ''),
        v_seconds,
        v_weight,
        v_rest_seconds,
        NULLIF(btrim(v_exercise ->> 'coach_notes'), ''),
        NULLIF(btrim(v_exercise ->> 'video_url'), ''),
        v_order,
        v_is_unilateral,
        v_reps_per_side,
        v_total_reps,
        p_target_user_id
      )
      RETURNING id INTO v_client_item_id;

      IF jsonb_typeof(COALESCE(v_exercise -> 'alternatives', '[]'::jsonb)) = 'array' THEN
        FOR v_alternative IN
          SELECT value FROM jsonb_array_elements(COALESCE(v_exercise -> 'alternatives', '[]'::jsonb))
        LOOP
          IF NULLIF(btrim(v_alternative ->> 'alternative_name'), '') IS NOT NULL THEN
            INSERT INTO public.template_alternatives(
              primary_exercise_id,
              alternative_name,
              alternative_description,
              alternative_video_url,
              difficulty_level,
              equipment_required,
              muscle_groups,
              created_by
            )
            VALUES (
              v_template_item_id,
              btrim(v_alternative ->> 'alternative_name'),
              NULLIF(btrim(v_alternative ->> 'alternative_description'), ''),
              NULLIF(btrim(v_alternative ->> 'alternative_video_url'), ''),
              COALESCE(NULLIF(v_alternative ->> 'difficulty_level', ''), 'same'),
              CASE WHEN jsonb_typeof(v_alternative -> 'equipment_required') = 'array'
                THEN ARRAY(SELECT jsonb_array_elements_text(v_alternative -> 'equipment_required'))
                ELSE NULL END,
              CASE WHEN jsonb_typeof(v_alternative -> 'muscle_groups') = 'array'
                THEN ARRAY(SELECT jsonb_array_elements_text(v_alternative -> 'muscle_groups'))
                ELSE NULL END,
              auth.uid()
            );

            INSERT INTO public.exercise_alternatives(
              primary_exercise_id,
              alternative_name,
              alternative_description,
              alternative_video_url,
              difficulty_level,
              equipment_required,
              muscle_groups,
              created_by
            )
            VALUES (
              v_client_item_id,
              btrim(v_alternative ->> 'alternative_name'),
              NULLIF(btrim(v_alternative ->> 'alternative_description'), ''),
              NULLIF(btrim(v_alternative ->> 'alternative_video_url'), ''),
              COALESCE(NULLIF(v_alternative ->> 'difficulty_level', ''), 'same'),
              CASE WHEN jsonb_typeof(v_alternative -> 'equipment_required') = 'array'
                THEN ARRAY(SELECT jsonb_array_elements_text(v_alternative -> 'equipment_required'))
                ELSE NULL END,
              CASE WHEN jsonb_typeof(v_alternative -> 'muscle_groups') = 'array'
                THEN ARRAY(SELECT jsonb_array_elements_text(v_alternative -> 'muscle_groups'))
                ELSE NULL END,
              auth.uid()
            );
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;

  RETURN v_program_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_add_program_exercise(
  p_program_id uuid,
  p_day_id uuid,
  p_exercise_name text,
  p_exercise_type text,
  p_sets integer,
  p_reps text,
  p_seconds integer,
  p_weight_kg numeric,
  p_rest_seconds integer,
  p_coach_notes text,
  p_video_url text,
  p_is_unilateral boolean,
  p_reps_per_side integer,
  p_total_reps integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_id uuid;
  v_next_order integer;
  v_user_id uuid;
BEGIN
  IF NOT public.is_admin_secure(auth.uid()) THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  SELECT cp.assigned_to
  INTO v_user_id
  FROM public.client_days cd
  JOIN public.client_programs cp ON cp.id = cd.client_program_id
  WHERE cd.id = p_day_id
    AND cp.id = p_program_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'day not found in program' USING ERRCODE = 'P0002';
  END IF;

  IF NULLIF(btrim(p_exercise_name), '') IS NULL THEN
    RAISE EXCEPTION 'exercise name is required' USING ERRCODE = '22023';
  END IF;

  IF p_sets < 1 OR p_sets > 50 THEN
    RAISE EXCEPTION 'exercise sets must be between 1 and 50' USING ERRCODE = '22023';
  END IF;

  IF p_seconds IS NULL AND NULLIF(btrim(p_reps), '') IS NULL THEN
    RAISE EXCEPTION 'exercise reps or seconds are required' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(MAX(order_in_day), 0) + 1
  INTO v_next_order
  FROM public.client_items
  WHERE client_day_id = p_day_id;

  INSERT INTO public.client_items(
    client_day_id,
    exercise_name,
    base_exercise_name,
    exercise_type,
    sets,
    reps,
    seconds,
    weight_kg,
    rest_seconds,
    coach_notes,
    video_url,
    order_in_day,
    is_unilateral,
    reps_per_side,
    total_reps,
    user_id
  )
  VALUES (
    p_day_id,
    btrim(p_exercise_name),
    btrim(p_exercise_name),
    COALESCE(NULLIF(p_exercise_type, ''), 'isolation'),
    p_sets,
    COALESCE(p_reps, ''),
    p_seconds,
    p_weight_kg,
    p_rest_seconds,
    NULLIF(btrim(p_coach_notes), ''),
    NULLIF(btrim(p_video_url), ''),
    v_next_order,
    COALESCE(p_is_unilateral, false),
    p_reps_per_side,
    p_total_reps,
    v_user_id
  )
  RETURNING id INTO v_item_id;

  RETURN v_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_move_program_exercise(
  p_program_id uuid,
  p_item_id uuid,
  p_direction integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_id uuid;
  v_current_order integer;
  v_target_id uuid;
  v_target_order integer;
BEGIN
  IF NOT public.is_admin_secure(auth.uid()) THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  IF p_direction NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'direction must be -1 or 1' USING ERRCODE = '22023';
  END IF;

  SELECT ci.client_day_id, ci.order_in_day
  INTO v_day_id, v_current_order
  FROM public.client_items ci
  JOIN public.client_days cd ON cd.id = ci.client_day_id
  WHERE ci.id = p_item_id
    AND cd.client_program_id = p_program_id
  FOR UPDATE OF ci;

  IF v_day_id IS NULL THEN
    RAISE EXCEPTION 'exercise not found in program' USING ERRCODE = 'P0002';
  END IF;

  SELECT id, order_in_day
  INTO v_target_id, v_target_order
  FROM public.client_items
  WHERE client_day_id = v_day_id
    AND order_in_day = v_current_order + p_direction
  FOR UPDATE;

  IF v_target_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.client_items
  SET order_in_day = 1000000 + v_current_order
  WHERE id = p_item_id;

  UPDATE public.client_items
  SET order_in_day = v_current_order
  WHERE id = v_target_id;

  UPDATE public.client_items
  SET order_in_day = v_target_order
  WHERE id = p_item_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.create_personal_program(uuid, text, date, integer, boolean, jsonb)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_personal_program(uuid, text, date, integer, boolean, jsonb)
TO authenticated;

REVOKE ALL ON FUNCTION public.admin_add_program_exercise(
  uuid, uuid, text, text, integer, text, integer, numeric, integer, text, text,
  boolean, integer, integer
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_add_program_exercise(
  uuid, uuid, text, text, integer, text, integer, numeric, integer, text, text,
  boolean, integer, integer
) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_move_program_exercise(uuid, uuid, integer)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_move_program_exercise(uuid, uuid, integer)
TO authenticated;
