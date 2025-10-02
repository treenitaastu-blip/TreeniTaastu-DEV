-- Create indexes for efficient queries (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_client_programs_status ON public.client_programs(status);
CREATE INDEX IF NOT EXISTS idx_client_programs_completed_at ON public.client_programs(completed_at);

-- Create a view for program analytics
CREATE OR REPLACE VIEW public.v_program_progress AS
SELECT 
  cp.id as program_id,
  cp.assigned_to as user_id,
  cp.start_date,
  cp.duration_weeks,
  cp.status,
  cp.completed_at,
  cp.auto_progression_enabled,
  -- Calculate weeks elapsed since start
  CASE 
    WHEN cp.start_date IS NULL THEN 0
    ELSE CEIL(EXTRACT(EPOCH FROM (COALESCE(cp.completed_at, NOW()) - cp.start_date)) / (7 * 24 * 3600))
  END as weeks_elapsed,
  -- Calculate progress percentage
  CASE 
    WHEN cp.duration_weeks IS NULL OR cp.duration_weeks = 0 THEN 0
    WHEN cp.start_date IS NULL THEN 0
    ELSE LEAST(100, ROUND(
      (EXTRACT(EPOCH FROM (COALESCE(cp.completed_at, NOW()) - cp.start_date)) / (7 * 24 * 3600)) 
      / cp.duration_weeks * 100, 1
    ))
  END as progress_percentage,
  -- Program completion status
  CASE 
    WHEN cp.status = 'completed' THEN true
    WHEN cp.start_date IS NULL THEN false
    ELSE (EXTRACT(EPOCH FROM (NOW() - cp.start_date)) / (7 * 24 * 3600)) >= cp.duration_weeks
  END as is_due_for_completion
FROM public.client_programs cp;

-- Create function to analyze RPE and suggest progressions
CREATE OR REPLACE FUNCTION public.analyze_exercise_progression(
  p_client_item_id UUID,
  p_weeks_back INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg_rpe NUMERIC;
  v_session_count INTEGER;
  v_current_weight NUMERIC;
  v_current_reps TEXT;
  v_suggestion JSONB;
  v_rpe_target_min NUMERIC := 6;
  v_rpe_target_max NUMERIC := 8;
  v_weight_increment NUMERIC := 5;
BEGIN
  -- Get average RPE for the exercise over the specified weeks
  SELECT 
    AVG(en.rpe),
    COUNT(DISTINCT ws.id)
  INTO v_avg_rpe, v_session_count
  FROM exercise_notes en
  JOIN workout_sessions ws ON ws.id = en.session_id
  WHERE en.client_item_id = p_client_item_id
    AND en.rpe IS NOT NULL
    AND ws.started_at >= NOW() - (p_weeks_back || ' weeks')::INTERVAL;

  -- Get current exercise parameters
  SELECT weight_kg, reps 
  INTO v_current_weight, v_current_reps
  FROM client_items 
  WHERE id = p_client_item_id;

  -- If not enough data, return no change
  IF v_avg_rpe IS NULL OR v_session_count < 2 THEN
    RETURN jsonb_build_object(
      'action', 'maintain',
      'reason', 'insufficient_data',
      'current_weight', v_current_weight,
      'current_reps', v_current_reps,
      'avg_rpe', v_avg_rpe,
      'session_count', v_session_count
    );
  END IF;

  -- Analyze and suggest progression
  IF v_avg_rpe < v_rpe_target_min THEN
    -- Too easy, increase intensity
    v_suggestion := jsonb_build_object(
      'action', 'increase_weight',
      'reason', 'rpe_too_low',
      'current_weight', v_current_weight,
      'suggested_weight', CASE 
        WHEN v_current_weight IS NOT NULL THEN ROUND(v_current_weight * (1 + v_weight_increment/100), 1)
        ELSE NULL
      END,
      'current_reps', v_current_reps,
      'avg_rpe', ROUND(v_avg_rpe, 1),
      'session_count', v_session_count
    );
  ELSIF v_avg_rpe > v_rpe_target_max THEN
    -- Too hard, decrease intensity or maintain
    v_suggestion := jsonb_build_object(
      'action', 'decrease_weight',
      'reason', 'rpe_too_high', 
      'current_weight', v_current_weight,
      'suggested_weight', CASE 
        WHEN v_current_weight IS NOT NULL THEN ROUND(v_current_weight * (1 - v_weight_increment/100), 1)
        ELSE NULL
      END,
      'current_reps', v_current_reps,
      'avg_rpe', ROUND(v_avg_rpe, 1),
      'session_count', v_session_count
    );
  ELSE
    -- Perfect range, maintain current intensity
    v_suggestion := jsonb_build_object(
      'action', 'maintain',
      'reason', 'rpe_optimal',
      'current_weight', v_current_weight,
      'current_reps', v_current_reps,
      'avg_rpe', ROUND(v_avg_rpe, 1),
      'session_count', v_session_count
    );
  END IF;

  RETURN v_suggestion;
END;
$$;

-- Create function to auto-progress a program
CREATE OR REPLACE FUNCTION public.auto_progress_program(p_program_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_program_record RECORD;
  v_item_record RECORD;
  v_progression JSONB;
  v_updates_made INTEGER := 0;
  v_results JSONB := '[]'::jsonb;
BEGIN
  -- Check if program exists and has auto-progression enabled
  SELECT * INTO v_program_record
  FROM client_programs 
  WHERE id = p_program_id 
    AND auto_progression_enabled = true 
    AND status = 'active';
    
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'program_not_found_or_disabled',
      'updates_made', 0
    );
  END IF;

  -- Loop through all exercises in the program
  FOR v_item_record IN 
    SELECT ci.*, cd.client_program_id
    FROM client_items ci
    JOIN client_days cd ON cd.id = ci.client_day_id
    WHERE cd.client_program_id = p_program_id
  LOOP
    -- Analyze progression for this exercise
    v_progression := analyze_exercise_progression(v_item_record.id, 1);
    
    -- Apply progression if suggested
    IF (v_progression->>'action') = 'increase_weight' AND (v_progression->>'suggested_weight') IS NOT NULL THEN
      UPDATE client_items 
      SET weight_kg = (v_progression->>'suggested_weight')::NUMERIC
      WHERE id = v_item_record.id;
      v_updates_made := v_updates_made + 1;
    ELSIF (v_progression->>'action') = 'decrease_weight' AND (v_progression->>'suggested_weight') IS NOT NULL THEN
      UPDATE client_items 
      SET weight_kg = (v_progression->>'suggested_weight')::NUMERIC
      WHERE id = v_item_record.id;
      v_updates_made := v_updates_made + 1;
    END IF;
    
    -- Add to results
    v_results := v_results || jsonb_build_object(
      'exercise_name', v_item_record.exercise_name,
      'item_id', v_item_record.id,
      'progression', v_progression
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'program_id', p_program_id,
    'updates_made', v_updates_made,
    'progressions', v_results
  );
END;
$$;

-- Create function to complete programs that are due
CREATE OR REPLACE FUNCTION public.complete_due_programs()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completed_count INTEGER := 0;
  v_program_record RECORD;
BEGIN
  -- Find and complete programs that are due
  FOR v_program_record IN
    SELECT id, assigned_to, duration_weeks, start_date
    FROM client_programs
    WHERE status = 'active'
      AND start_date IS NOT NULL
      AND EXTRACT(EPOCH FROM (NOW() - start_date)) / (7 * 24 * 3600) >= duration_weeks
  LOOP
    -- Mark program as completed
    UPDATE client_programs 
    SET 
      status = 'completed',
      completed_at = NOW()
    WHERE id = v_program_record.id;
    
    v_completed_count := v_completed_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'completed_programs', v_completed_count,
    'timestamp', NOW()
  );
END;
$$;