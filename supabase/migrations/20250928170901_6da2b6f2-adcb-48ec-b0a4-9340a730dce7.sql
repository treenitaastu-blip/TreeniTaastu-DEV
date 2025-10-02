-- Create optimized progression algorithm
CREATE OR REPLACE FUNCTION public.analyze_exercise_progression_optimized(
  p_client_item_id uuid, 
  p_weeks_back integer DEFAULT 3
) RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_exercise_data RECORD;
  v_current_weight NUMERIC;
  v_current_reps TEXT;
  v_exercise_type TEXT := 'isolation'; -- default
  v_session_count INTEGER;
  v_avg_rpe NUMERIC;
  v_avg_rir NUMERIC;
  v_rpe_trend NUMERIC;
  v_volume_trend NUMERIC;
  v_consistency_score NUMERIC;
  v_confidence_score NUMERIC;
  v_recommendation TEXT;
  v_suggested_weight NUMERIC;
  v_suggested_reps TEXT;
  v_deload_needed BOOLEAN := false;
  v_base_increment NUMERIC := 0.05; -- 5% base increment
  v_compound_exercises TEXT[] := ARRAY[
    'squat', 'deadlift', 'bench press', 'overhead press', 'row', 'pull up', 'chin up',
    'dip', 'lunge', 'bulgarian split squat', 'hip thrust', 'romanian deadlift'
  ];
BEGIN
  -- Get exercise details
  SELECT ci.*
  INTO v_exercise_data
  FROM client_items ci
  WHERE ci.id = p_client_item_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error', 'Exercise not found',
      'exercise_id', p_client_item_id
    );
  END IF;
  
  v_current_weight := v_exercise_data.weight_kg;
  v_current_reps := v_exercise_data.reps;
  
  -- Determine exercise type based on name
  IF EXISTS (
    SELECT 1 FROM unnest(v_compound_exercises) AS compound_ex
    WHERE LOWER(v_exercise_data.exercise_name) LIKE '%' || compound_ex || '%'
  ) THEN
    v_exercise_type := 'compound';
    v_base_increment := 0.025; -- 2.5% for compound exercises
  END IF;

  -- Analyze recent performance with RPE and RIR data
  WITH recent_sessions AS (
    SELECT 
      ws.started_at::date as session_date,
      en.rpe,
      en.rir_done,
      AVG(sl.weight_kg_done * sl.reps_done) as session_volume,
      COUNT(sl.id) as sets_completed,
      ROW_NUMBER() OVER (ORDER BY ws.started_at DESC) as session_rank
    FROM workout_sessions ws
    LEFT JOIN exercise_notes en ON en.session_id = ws.id AND en.client_item_id = p_client_item_id
    LEFT JOIN set_logs sl ON sl.session_id = ws.id AND sl.client_item_id = p_client_item_id
    WHERE ws.started_at >= NOW() - (p_weeks_back || ' weeks')::INTERVAL
      AND ws.ended_at IS NOT NULL
      AND (en.rpe IS NOT NULL OR en.rir_done IS NOT NULL)
      AND sl.id IS NOT NULL
    GROUP BY ws.started_at::date, en.rpe, en.rir_done
    ORDER BY ws.started_at DESC
  ),
  performance_stats AS (
    SELECT 
      COUNT(*) as session_count,
      AVG(rpe) as avg_rpe,
      AVG(rir_done) as avg_rir,
      STDDEV(rpe) as rpe_variance,
      AVG(session_volume) as avg_volume,
      -- Trend analysis: compare recent vs earlier sessions
      AVG(CASE WHEN session_rank <= 3 THEN rpe END) as recent_rpe,
      AVG(CASE WHEN session_rank > 3 THEN rpe END) as earlier_rpe,
      AVG(CASE WHEN session_rank <= 3 THEN session_volume END) as recent_volume,
      AVG(CASE WHEN session_rank > 3 THEN session_volume END) as earlier_volume
    FROM recent_sessions
  )
  SELECT 
    COALESCE(ps.session_count, 0),
    COALESCE(ps.avg_rpe, 7),
    COALESCE(ps.avg_rir, 2),
    COALESCE(ps.rpe_variance, 0),
    CASE 
      WHEN ps.recent_rpe IS NOT NULL AND ps.earlier_rpe IS NOT NULL 
      THEN ps.recent_rpe - ps.earlier_rpe
      ELSE 0
    END,
    CASE 
      WHEN ps.recent_volume IS NOT NULL AND ps.earlier_volume IS NOT NULL AND ps.earlier_volume > 0
      THEN (ps.recent_volume - ps.earlier_volume) / ps.earlier_volume
      ELSE 0
    END
  INTO v_session_count, v_avg_rpe, v_avg_rir, v_consistency_score, v_rpe_trend, v_volume_trend
  FROM performance_stats ps;
  
  -- Calculate consistency score (inverse of RPE variance)
  v_consistency_score := CASE 
    WHEN v_consistency_score IS NULL OR v_consistency_score = 0 THEN 1.0
    ELSE GREATEST(0, 1 - (v_consistency_score / 2))
  END;
  
  -- Check for deload need (high RPE trend across multiple exercises)
  WITH program_rpe AS (
    SELECT AVG(en.rpe) as program_avg_rpe
    FROM exercise_notes en
    JOIN workout_sessions ws ON ws.id = en.session_id
    JOIN client_items ci ON ci.id = en.client_item_id
    JOIN client_days cd ON cd.id = ci.client_day_id
    WHERE cd.client_program_id = (
      SELECT cd2.client_program_id 
      FROM client_items ci2 
      JOIN client_days cd2 ON cd2.id = ci2.client_day_id 
      WHERE ci2.id = p_client_item_id
    )
    AND ws.started_at >= NOW() - '1 week'::INTERVAL
    AND en.rpe IS NOT NULL
  )
  SELECT (program_avg_rpe > 8.5) INTO v_deload_needed FROM program_rpe;
  
  -- Calculate confidence score based on data quality
  v_confidence_score := CASE
    WHEN v_session_count >= 6 THEN 0.9
    WHEN v_session_count >= 4 THEN 0.8
    WHEN v_session_count >= 2 THEN 0.6
    ELSE 0.3
  END * v_consistency_score;
  
  -- Progression decision logic
  IF v_session_count < 2 OR v_confidence_score < 0.5 THEN
    v_recommendation := 'maintain';
    v_suggested_weight := v_current_weight;
    v_suggested_reps := v_current_reps;
  ELSIF v_deload_needed THEN
    v_recommendation := 'deload';
    v_suggested_weight := CASE 
      WHEN v_current_weight IS NOT NULL THEN ROUND(v_current_weight * 0.9, 1)
      ELSE NULL
    END;
    v_suggested_reps := v_current_reps;
  ELSIF (v_avg_rpe < 6.5 OR (v_avg_rir > 3 AND v_avg_rpe < 7.5)) AND v_rpe_trend <= 0 THEN
    -- Too easy: low RPE or high RIR and not getting harder
    v_recommendation := 'increase_weight';
    v_suggested_weight := CASE 
      WHEN v_current_weight IS NOT NULL THEN 
        ROUND(v_current_weight * (1 + v_base_increment), 1)
      ELSE NULL
    END;
    v_suggested_reps := v_current_reps;
  ELSIF v_avg_rpe > 8.5 OR (v_avg_rir < 1 AND v_avg_rpe > 8) OR v_rpe_trend > 0.5 THEN
    -- Too hard: high RPE, low RIR, or getting progressively harder
    v_recommendation := 'decrease_weight';
    v_suggested_weight := CASE 
      WHEN v_current_weight IS NOT NULL THEN 
        ROUND(v_current_weight * (1 - v_base_increment), 1)
      ELSE NULL
    END;
    v_suggested_reps := v_current_reps;
  ELSIF v_avg_rpe BETWEEN 6.5 AND 8.5 AND v_avg_rir BETWEEN 1 AND 3 THEN
    -- Optimal zone: consider micro-progression or maintain
    IF v_rpe_trend < -0.2 AND v_volume_trend > 0.1 THEN
      -- Getting easier and volume increasing = micro-progression
      v_recommendation := 'micro_increase';
      v_suggested_weight := CASE 
        WHEN v_current_weight IS NOT NULL THEN 
          ROUND(v_current_weight * (1 + v_base_increment/2), 1)
        ELSE NULL
      END;
      v_suggested_reps := v_current_reps;
    ELSE
      v_recommendation := 'maintain';
      v_suggested_weight := v_current_weight;
      v_suggested_reps := v_current_reps;
    END IF;
  ELSE
    v_recommendation := 'maintain';
    v_suggested_weight := v_current_weight;
    v_suggested_reps := v_current_reps;
  END IF;
  
  RETURN jsonb_build_object(
    'action', v_recommendation,
    'exercise_type', v_exercise_type,
    'current_weight', v_current_weight,
    'suggested_weight', v_suggested_weight,
    'current_reps', v_current_reps,
    'suggested_reps', v_suggested_reps,
    'avg_rpe', ROUND(v_avg_rpe, 1),
    'avg_rir', ROUND(v_avg_rir, 1),
    'rpe_trend', ROUND(v_rpe_trend, 2),
    'volume_trend', ROUND(v_volume_trend, 2),
    'session_count', v_session_count,
    'confidence_score', ROUND(v_confidence_score, 2),
    'consistency_score', ROUND(v_consistency_score, 2),
    'deload_needed', v_deload_needed,
    'weeks_analyzed', p_weeks_back,
    'reasoning', CASE v_recommendation
      WHEN 'maintain' THEN 'RPE and RIR in optimal range, maintain current load'
      WHEN 'increase_weight' THEN 'RPE too low or RIR too high, increase intensity'
      WHEN 'decrease_weight' THEN 'RPE too high or RIR too low, reduce intensity'
      WHEN 'micro_increase' THEN 'Optimal zone with positive adaptations, small increase'
      WHEN 'deload' THEN 'Program-wide high RPE detected, deload recommended'
      ELSE 'Insufficient data or low confidence'
    END
  );
END;
$function$;

-- Update the auto progression function to use the optimized algorithm
CREATE OR REPLACE FUNCTION public.auto_progress_program_optimized(p_program_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_program_record RECORD;
  v_item_record RECORD;
  v_progression JSONB;
  v_updates_made INTEGER := 0;
  v_results JSONB := '[]'::jsonb;
  v_deload_count INTEGER := 0;
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
    ORDER BY cd.day_order, ci.order_in_day
  LOOP
    -- Use optimized progression analysis
    v_progression := analyze_exercise_progression_optimized(v_item_record.id, 3);
    
    -- Apply progression based on recommendation
    IF (v_progression->>'confidence_score')::NUMERIC >= 0.6 THEN
      CASE (v_progression->>'action')
        WHEN 'increase_weight', 'micro_increase' THEN
          IF (v_progression->>'suggested_weight') IS NOT NULL THEN
            UPDATE client_items 
            SET weight_kg = (v_progression->>'suggested_weight')::NUMERIC
            WHERE id = v_item_record.id;
            v_updates_made := v_updates_made + 1;
          END IF;
        WHEN 'decrease_weight', 'deload' THEN
          IF (v_progression->>'suggested_weight') IS NOT NULL THEN
            UPDATE client_items 
            SET weight_kg = (v_progression->>'suggested_weight')::NUMERIC
            WHERE id = v_item_record.id;
            v_updates_made := v_updates_made + 1;
            IF (v_progression->>'action') = 'deload' THEN
              v_deload_count := v_deload_count + 1;
            END IF;
          END IF;
        -- 'maintain' requires no action
        ELSE NULL;
      END CASE;
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
    'deload_exercises', v_deload_count,
    'algorithm_version', 'optimized_v1',
    'progressions', v_results
  );
END;
$function$;