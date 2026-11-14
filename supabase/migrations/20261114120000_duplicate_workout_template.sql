-- Duplicate an entire reusable workout template in one transaction.
-- Client programs are intentionally not copied: the new template is an
-- independent editable starting point and existing assigned programs remain
-- attached to the original template.

CREATE OR REPLACE FUNCTION public.admin_duplicate_workout_template(
  p_template_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source public.workout_templates%ROWTYPE;
  v_day public.template_days%ROWTYPE;
  v_item public.template_items%ROWTYPE;
  v_alternative public.template_alternatives%ROWTYPE;
  v_new_template_id uuid;
  v_new_day_id uuid;
  v_new_item_id uuid;
  v_copy_title text;
  v_copy_number integer := 2;
BEGIN
  IF NOT public.is_admin_secure(auth.uid()) THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  IF p_template_id IS NULL THEN
    RAISE EXCEPTION 'template id is required' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_source
  FROM public.workout_templates
  WHERE id = p_template_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'template not found' USING ERRCODE = 'P0002';
  END IF;

  v_copy_title := v_source.title || ' (koopia)';

  WHILE EXISTS (
    SELECT 1
    FROM public.workout_templates
    WHERE title = v_copy_title
  ) LOOP
    v_copy_title := v_source.title || ' (koopia ' || v_copy_number || ')';
    v_copy_number := v_copy_number + 1;
  END LOOP;

  INSERT INTO public.workout_templates(
    title,
    goal,
    is_active,
    created_by
  )
  VALUES (
    v_copy_title,
    v_source.goal,
    v_source.is_active,
    auth.uid()
  )
  RETURNING id INTO v_new_template_id;

  FOR v_day IN
    SELECT *
    FROM public.template_days
    WHERE template_id = p_template_id
    ORDER BY day_order, id
  LOOP
    INSERT INTO public.template_days(
      template_id,
      day_order,
      title,
      note,
      weekday
    )
    VALUES (
      v_new_template_id,
      v_day.day_order,
      v_day.title,
      v_day.note,
      v_day.weekday
    )
    RETURNING id INTO v_new_day_id;

    FOR v_item IN
      SELECT *
      FROM public.template_items
      WHERE template_day_id = v_day.id
      ORDER BY order_in_day, id
    LOOP
      INSERT INTO public.template_items(
        template_day_id,
        exercise_name,
        exercise_type,
        sets,
        reps,
        rest_seconds,
        seconds,
        weight_kg,
        coach_notes,
        order_in_day,
        video_url,
        is_unilateral,
        reps_per_side,
        total_reps
      )
      VALUES (
        v_new_day_id,
        v_item.exercise_name,
        v_item.exercise_type,
        v_item.sets,
        v_item.reps,
        v_item.rest_seconds,
        v_item.seconds,
        v_item.weight_kg,
        v_item.coach_notes,
        v_item.order_in_day,
        v_item.video_url,
        v_item.is_unilateral,
        v_item.reps_per_side,
        v_item.total_reps
      )
      RETURNING id INTO v_new_item_id;

      FOR v_alternative IN
        SELECT *
        FROM public.template_alternatives
        WHERE primary_exercise_id = v_item.id
        ORDER BY created_at, id
      LOOP
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
          v_new_item_id,
          v_alternative.alternative_name,
          v_alternative.alternative_description,
          v_alternative.alternative_video_url,
          v_alternative.difficulty_level,
          v_alternative.equipment_required,
          v_alternative.muscle_groups,
          auth.uid()
        );
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN v_new_template_id;
END
$$;

REVOKE ALL ON FUNCTION public.admin_duplicate_workout_template(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_duplicate_workout_template(uuid)
  TO authenticated;

COMMENT ON FUNCTION public.admin_duplicate_workout_template(uuid) IS
'Admin-only transactional copy of a workout template, including days, exercises and alternatives. Assigned client programs are not copied.';
