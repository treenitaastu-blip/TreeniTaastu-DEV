-- Reorder template exercises atomically. Directly swapping two rows violates
-- template_items_day_order_unique on the first UPDATE.
CREATE OR REPLACE FUNCTION public.admin_move_template_exercise(
  p_template_id uuid,
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
  v_temporary_order integer;
BEGIN
  IF NOT public.is_admin_secure(auth.uid()) THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  IF p_direction NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'direction must be -1 or 1' USING ERRCODE = '22023';
  END IF;

  SELECT ti.template_day_id, ti.order_in_day
  INTO v_day_id, v_current_order
  FROM public.template_items ti
  JOIN public.template_days td ON td.id = ti.template_day_id
  WHERE ti.id = p_item_id
    AND td.template_id = p_template_id
  FOR UPDATE OF ti;

  IF v_day_id IS NULL THEN
    RAISE EXCEPTION 'exercise not found in template' USING ERRCODE = 'P0002';
  END IF;

  IF p_direction = -1 THEN
    SELECT id, order_in_day
    INTO v_target_id, v_target_order
    FROM public.template_items
    WHERE template_day_id = v_day_id
      AND order_in_day < v_current_order
    ORDER BY order_in_day DESC
    LIMIT 1
    FOR UPDATE;
  ELSE
    SELECT id, order_in_day
    INTO v_target_id, v_target_order
    FROM public.template_items
    WHERE template_day_id = v_day_id
      AND order_in_day > v_current_order
    ORDER BY order_in_day ASC
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_target_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT COALESCE(MAX(order_in_day), 0) + 1000000
  INTO v_temporary_order
  FROM public.template_items
  WHERE template_day_id = v_day_id;

  UPDATE public.template_items
  SET order_in_day = v_temporary_order
  WHERE id = p_item_id;

  UPDATE public.template_items
  SET order_in_day = v_current_order
  WHERE id = v_target_id;

  UPDATE public.template_items
  SET order_in_day = v_target_order
  WHERE id = p_item_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_move_template_exercise(uuid, uuid, integer)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_move_template_exercise(uuid, uuid, integer)
TO authenticated;
