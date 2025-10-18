-- Copy alternatives for existing programs that don't have them yet
CREATE OR REPLACE FUNCTION public.copy_alternatives_for_existing_programs()
RETURNS TABLE(program_id uuid, items_processed int, alternatives_copied int)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    FROM client_programs cp
    WHERE cp.template_id IS NOT NULL
  LOOP
    v_items_processed := 0;
    v_alternatives_copied := 0;
    
    -- For each client item in this program, copy alternatives if they don't exist
    FOR v_template_item_id, v_client_item_id IN
      SELECT ti.id, ci.id
      FROM template_days td
      JOIN template_items ti ON ti.template_day_id = td.id
      JOIN client_days cd ON cd.client_program_id = v_program_record.program_id AND cd.day_order = td.day_order
      JOIN client_items ci ON ci.client_day_id = cd.id AND ci.order_in_day = ti.order_in_day
      WHERE td.template_id = v_program_record.template_id
        AND NOT EXISTS (
          SELECT 1 FROM exercise_alternatives ea 
          WHERE ea.primary_exercise_id = ci.id
        )
    LOOP
      v_items_processed := v_items_processed + 1;
      
      -- Copy alternatives for this specific template item
      INSERT INTO exercise_alternatives (
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
      FROM template_alternatives ta
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
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.copy_alternatives_for_existing_programs() TO authenticated;
