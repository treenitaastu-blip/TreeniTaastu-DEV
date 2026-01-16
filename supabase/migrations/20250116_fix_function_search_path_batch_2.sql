-- Fix Function Search Path - Batch 2 (Copy and Current User Functions)
-- Phase 3: Security Fixes (Function Search Path)

-- copy_alternatives_for_existing_programs
CREATE OR REPLACE FUNCTION public.copy_alternatives_for_existing_programs()
 RETURNS TABLE(program_id uuid, items_processed integer, alternatives_copied integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  v_program_record RECORD;
  v_client_item_id uuid;
  v_template_item_id uuid;
  v_items_processed int := 0;
  v_alternatives_copied int := 0;
  v_total_items int := 0;
  v_total_alternatives int := 0;
BEGIN
  -- Process each existing program
  FOR v_program_record IN
    SELECT cp.id as program_id, cp.template_id
    FROM public.client_programs cp
    WHERE cp.template_id IS NOT NULL
  LOOP
    v_items_processed := 0;
    v_alternatives_copied := 0;
    
    -- For each client item in this program, copy alternatives if they don't exist
    FOR v_template_item_id, v_client_item_id IN
      SELECT ti.id, ci.id
      FROM public.template_days td
      JOIN public.template_items ti ON ti.template_day_id = td.id
      JOIN public.client_days cd ON cd.client_program_id = v_program_record.program_id AND cd.day_order = td.day_order
      JOIN public.client_items ci ON ci.client_day_id = cd.id AND ci.order_in_day = ti.order_in_day
      WHERE td.template_id = v_program_record.template_id
        AND NOT EXISTS (
          SELECT 1 FROM public.exercise_alternatives ea 
          WHERE ea.primary_exercise_id = ci.id
        )
    LOOP
      v_items_processed := v_items_processed + 1;
      
      -- Copy alternatives for this specific template item
      INSERT INTO public.exercise_alternatives (
        primary_exercise_id,
        alternative_name,
        alternative_description,
        alternative_video_url,
        difficulty_level,
        equipment_required,
        muscle_groups
      )
      SELECT
        v_client_item_id,
        ta.alternative_name,
        ta.alternative_description,
        ta.alternative_video_url,
        ta.difficulty_level,
        ta.equipment_required,
        ta.muscle_groups
      FROM public.template_alternatives ta
      WHERE ta.primary_exercise_id = v_template_item_id;
      
      GET DIAGNOSTICS v_alternatives_copied = ROW_COUNT;
      v_total_alternatives := v_total_alternatives + v_alternatives_copied;
    END LOOP;
    
    v_total_items := v_total_items + v_items_processed;
    
    -- Return info for this program
    program_id := v_program_record.program_id;
    items_processed := v_items_processed;
    alternatives_copied := v_alternatives_copied;
    RETURN NEXT;
  END LOOP;
  
  -- Log summary
  RAISE NOTICE 'Processed % items across all programs, copied % alternatives', v_total_items, v_total_alternatives;
END;
$function$;

-- copy_template_alternatives_to_client
CREATE OR REPLACE FUNCTION public.copy_template_alternatives_to_client(p_template_item_id uuid, p_client_item_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  INSERT INTO public.exercise_alternatives (
    primary_exercise_id,
    alternative_name,
    alternative_description,
    alternative_video_url,
    difficulty_level,
    equipment_required,
    muscle_groups,
    created_by
  )
  SELECT 
    p_client_item_id,
    ta.alternative_name,
    ta.alternative_description,
    ta.alternative_video_url,
    ta.difficulty_level,
    ta.equipment_required,
    ta.muscle_groups,
    auth.uid()
  FROM public.template_alternatives ta
  WHERE ta.primary_exercise_id = p_template_item_id;
$function$;

-- current_user_id
CREATE OR REPLACE FUNCTION public.current_user_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT COALESCE(
    (SELECT id FROM auth.users WHERE id = auth.uid()),
    (SELECT id FROM auth.users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
  );
$function$;
