-- Enhanced progression system for professional training management
-- Fixed version without RECORD[] which isn't supported in PostgreSQL

-- Drop the failed function first
DROP FUNCTION IF EXISTS public.analyze_exercise_progression_enhanced(uuid, integer);

-- Create enhanced progression analysis function
CREATE OR REPLACE FUNCTION public.analyze_exercise_progression_enhanced(
  p_client_item_id uuid, 
  p_weeks_back integer DEFAULT 2
) RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_exercise_data RECORD;
  v_progression_data jsonb;
  v_current_weight NUMERIC;
  v_current_reps TEXT;
  v_avg_rpe NUMERIC;
  v_rpe_trend NUMERIC;
  v_consistency_score NUMERIC;
  v_volume_trend NUMERIC;
  v_session_count INTEGER;
  v_recommendation TEXT;
  v_suggested_weight NUMERIC;
  v_confidence_score NUMERIC;
  v_rpe_variance NUMERIC;
  v_total_volume NUMERIC;
BEGIN
  -- Get exercise details and current parameters
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

  -- Analyze recent performance with proper aggregation
  WITH recent_performance AS (
    SELECT 
      ws.started_at::date as session_date,
      en.rpe,
      AVG(sl.weight_kg_done * sl.reps_done) as session_volume,
      COUNT(sl.id) as sets_completed
    FROM workout_sessions ws
    LEFT JOIN exercise_notes en ON en.session_id = ws.id AND en.client_item_id = p_client_item_id
    LEFT JOIN set_logs sl ON sl.session_id = ws.id AND sl.client_item_id = p_client_item_id
    WHERE ws.started_at >= NOW() - (p_weeks_back || ' weeks')::INTERVAL
      AND ws.ended_at IS NOT NULL
      AND en.rpe IS NOT NULL
    GROUP BY ws.started_at::date, en.rpe
    ORDER BY session_date DESC
  ),
  performance_stats AS (
    SELECT 
      COUNT(*) as session_count,
      AVG(rpe) as avg_rpe,
      STDDEV(rpe) as rpe_variance,
      AVG(session_volume) as avg_volume,
      -- Simple trend calculation: compare first half vs second half
      AVG(CASE WHEN ROW_NUMBER() OVER (ORDER BY session_date) <= COUNT(*) OVER () / 2 THEN rpe END) as early_rpe,
      AVG(CASE WHEN ROW_NUMBER() OVER (ORDER BY session_date) > COUNT(*) OVER () / 2 THEN rpe END) as late_rpe,
      SUM(session_volume) as total_volume
    FROM recent_performance
  )
  SELECT 
    COALESCE(ps.session_count, 0),
    COALESCE(ps.avg_rpe, 7),
    COALESCE(ps.rpe_variance, 0),
    COALESCE(ps.avg_volume, 0),
    COALESCE(ps.total_volume, 0),
    -- RPE trend: positive = getting harder, negative = getting easier
    CASE 
      WHEN ps.late_rpe IS NOT NULL AND ps.early_rpe IS NOT NULL 
      THEN ps.late_rpe - ps.early_rpe
      ELSE 0
    END
  INTO v_session_count, v_avg_rpe, v_rpe_variance, v_total_volume, v_total_volume, v_rpe_trend
  FROM performance_stats ps;
  
  -- Calculate consistency score
  v_consistency_score := CASE 
    WHEN v_rpe_variance IS NULL OR v_rpe_variance = 0 THEN 1.0
    ELSE GREATEST(0, 1 - (v_rpe_variance / 3))
  END;
  
  -- Professional progression logic
  IF v_session_count < 2 THEN
    v_recommendation := 'maintain';
    v_suggested_weight := v_current_weight;
    v_confidence_score := 0.3;
  ELSIF v_avg_rpe < 6.5 AND v_consistency_score > 0.7 AND v_rpe_trend <= 0 THEN
    -- Too easy + consistent + not getting harder = increase intensity
    v_recommendation := 'increase_weight';
    v_suggested_weight := CASE 
      WHEN v_current_weight IS NOT NULL THEN 
        ROUND(v_current_weight * 1.05, 1) -- 5% increase
      ELSE NULL
    END;
    v_confidence_score := 0.8;
  ELSIF v_avg_rpe > 8.5 OR (v_avg_rpe > 8 AND v_rpe_trend > 0.5) THEN
    -- Too hard or getting progressively harder = decrease intensity
    v_recommendation := 'decrease_weight';
    v_suggested_weight := CASE 
      WHEN v_current_weight IS NOT NULL THEN 
        ROUND(v_current_weight * 0.95, 1) -- 5% decrease
      ELSE NULL
    END;
    v_confidence_score := 0.9;
  ELSIF v_avg_rpe BETWEEN 6.5 AND 8.5 AND v_consistency_score > 0.6 THEN
    -- In target zone + consistent = maintain or small progression
    IF v_rpe_trend < -0.3 THEN
      -- Getting easier over time = small increase
      v_recommendation := 'increase_weight';
      v_suggested_weight := CASE 
        WHEN v_current_weight IS NOT NULL THEN 
          ROUND(v_current_weight * 1.025, 1) -- 2.5% increase
        ELSE NULL
      END;
      v_confidence_score := 0.7;
    ELSE
      v_recommendation := 'maintain';
      v_suggested_weight := v_current_weight;
      v_confidence_score := 0.8;
    END IF;
  ELSE
    -- Inconsistent performance or insufficient data = maintain
    v_recommendation := 'maintain';
    v_suggested_weight := v_current_weight;
    v_confidence_score := 0.4;
  END IF;
  
  -- Build comprehensive progression data
  v_progression_data := jsonb_build_object(
    'action', v_recommendation,
    'reason', CASE v_recommendation
      WHEN 'increase_weight' THEN 
        CASE 
          WHEN v_avg_rpe < 6.5 THEN 'RPE too low - exercise is too easy'
          WHEN v_rpe_trend < -0.3 THEN 'Getting progressively easier - ready for advancement'
          ELSE 'Consistent good performance - time to progress'
        END
      WHEN 'decrease_weight' THEN
        CASE 
          WHEN v_avg_rpe > 8.5 THEN 'RPE too high - exercise is too challenging'
          WHEN v_rpe_trend > 0.5 THEN 'Getting progressively harder - need recovery'
          ELSE 'Preventing overreaching'
        END
      ELSE 'Maintain current intensity for consistency'
    END,
    'current_weight', v_current_weight,
    'suggested_weight', v_suggested_weight,
    'current_reps', v_current_reps,
    'avg_rpe', ROUND(v_avg_rpe, 1),
    'rpe_trend', ROUND(v_rpe_trend, 2),
    'consistency_score', ROUND(v_consistency_score, 2),
    'confidence_score', ROUND(v_confidence_score, 2),
    'session_count', v_session_count,
    'analysis_period_weeks', p_weeks_back,
    'exercise_name', v_exercise_data.exercise_name,
    'professional_notes', CASE 
      WHEN v_consistency_score < 0.5 THEN 'Focus on consistent RPE reporting for better recommendations'
      WHEN v_session_count < 3 THEN 'More data needed for confident progression decisions'
      WHEN v_confidence_score > 0.8 THEN 'High confidence recommendation based on solid data'
      ELSE 'Moderate confidence - monitor next few sessions'
    END
  );
  
  RETURN v_progression_data;
END;
$function$;

-- Enhanced auto-progression function
CREATE OR REPLACE FUNCTION public.auto_progress_program_enhanced(p_program_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_program_record RECORD;
  v_item_record RECORD;
  v_progression JSONB;
  v_updates_made INTEGER := 0;
  v_results JSONB := '[]'::jsonb;
  v_deload_recommended BOOLEAN := false;
  v_program_rpe_avg NUMERIC;
BEGIN
  -- Get program with progression parameters
  SELECT 
    cp.*,
    COUNT(ws.id) as total_sessions,
    AVG(en.rpe) as program_avg_rpe
  INTO v_program_record
  FROM client_programs cp
  LEFT JOIN workout_sessions ws ON ws.client_program_id = cp.id
  LEFT JOIN exercise_notes en ON en.session_id = ws.id
  WHERE cp.id = p_program_id 
    AND cp.auto_progression_enabled = true 
    AND cp.status = 'active'
  GROUP BY cp.id;
    
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'program_not_found_or_disabled',
      'updates_made', 0
    );
  END IF;

  v_program_rpe_avg := COALESCE(v_program_record.program_avg_rpe, 7);
  
  -- Check if deload is recommended (program-wide RPE too high)
  IF v_program_rpe_avg > 8.5 AND v_program_record.total_sessions > 6 THEN
    v_deload_recommended := true;
  END IF;

  -- Loop through all exercises in the program
  FOR v_item_record IN 
    SELECT ci.*, cd.client_program_id
    FROM client_items ci
    JOIN client_days cd ON cd.id = ci.client_day_id
    WHERE cd.client_program_id = p_program_id
    ORDER BY cd.day_order, ci.order_in_day
  LOOP
    -- Use enhanced progression analysis
    v_progression := analyze_exercise_progression_enhanced(v_item_record.id, 2);
    
    -- Apply deload if recommended program-wide
    IF v_deload_recommended THEN
      UPDATE client_items 
      SET weight_kg = CASE 
        WHEN weight_kg IS NOT NULL THEN ROUND(weight_kg * 0.85, 1) -- 15% deload
        ELSE weight_kg
      END
      WHERE id = v_item_record.id;
      v_updates_made := v_updates_made + 1;
      
      -- Override progression result for deload
      v_progression := v_progression || jsonb_build_object(
        'action', 'deload',
        'reason', 'Program-wide deload recommended due to high RPE',
        'suggested_weight', CASE 
          WHEN v_item_record.weight_kg IS NOT NULL THEN ROUND(v_item_record.weight_kg * 0.85, 1)
          ELSE v_item_record.weight_kg
        END
      );
    ELSE
      -- Apply individual exercise progression
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
    'deload_applied', v_deload_recommended,
    'program_avg_rpe', ROUND(v_program_rpe_avg, 1),
    'total_sessions_analyzed', v_program_record.total_sessions,
    'progressions', v_results,
    'professional_summary', CASE 
      WHEN v_deload_recommended THEN 'Deload week applied - program intensity was too high'
      WHEN v_updates_made > 0 THEN 'Progressive overload applied based on performance data'
      ELSE 'Program maintained - current intensity is appropriate'
    END
  );
END;
$function$;