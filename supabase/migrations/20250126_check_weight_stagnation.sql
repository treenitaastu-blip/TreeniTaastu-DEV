-- Function to check if an exercise needs weight progression recommendation based on RIR (Reps in Reserve)
-- Returns recommendation data if RIR is 5+ in the last 2 weeks (meaning exercise is too easy)
-- This is per-exercise basis, checking only this specific exercise's RIR data
CREATE OR REPLACE FUNCTION check_exercise_weight_stagnation(
  p_client_item_id UUID,
  p_weeks_back INTEGER DEFAULT 2
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_weight NUMERIC;
  v_avg_rir NUMERIC;
  v_max_rir NUMERIC;
  v_session_count INTEGER;
  v_sessions_with_high_rir INTEGER := 0;
  v_sessions_without_change INTEGER := 0;
  v_most_recent_avg_weight NUMERIC;
  v_most_recent_max_weight NUMERIC;
  v_weight_increase_threshold NUMERIC;
BEGIN
  -- Get current exercise weight
  SELECT weight_kg INTO v_current_weight
  FROM client_items
  WHERE id = p_client_item_id;

  -- Only check for weight-based exercises
  IF v_current_weight IS NULL OR v_current_weight <= 0 THEN
    RETURN jsonb_build_object(
      'needs_recommendation', false,
      'reason', 'not_weight_based'
    );
  END IF;

  -- Calculate weight increase threshold (2.5% or 0.5kg, whichever is larger)
  v_weight_increase_threshold := GREATEST(v_current_weight * 0.025, 0.5);

  -- Check if weight has increased in most recent completed session
  -- If user has already increased weight, no need to recommend
  WITH most_recent_session AS (
    SELECT 
      AVG(sl.weight_kg_done) as avg_weight_used,
      MAX(sl.weight_kg_done) as max_weight_used
    FROM workout_sessions ws
    INNER JOIN set_logs sl ON sl.session_id = ws.id
    WHERE sl.client_item_id = p_client_item_id
      AND ws.ended_at IS NOT NULL
      AND sl.weight_kg_done IS NOT NULL
    GROUP BY ws.id, ws.ended_at
    ORDER BY ws.ended_at DESC
    LIMIT 1
  )
  SELECT 
    avg_weight_used,
    max_weight_used
  INTO v_most_recent_avg_weight, v_most_recent_max_weight
  FROM most_recent_session;

  -- If weight increased in most recent session, dismiss recommendation
  -- Check both average and max weight to catch per-set weight increases
  IF v_most_recent_avg_weight IS NOT NULL AND v_most_recent_max_weight IS NOT NULL THEN
    IF v_most_recent_avg_weight > v_current_weight + v_weight_increase_threshold 
       OR v_most_recent_max_weight > v_current_weight + v_weight_increase_threshold THEN
      RETURN jsonb_build_object(
        'needs_recommendation', false,
        'reason', 'weight_increased_recently',
        'current_weight', v_current_weight,
        'recent_avg_weight', ROUND(v_most_recent_avg_weight, 2),
        'recent_max_weight', ROUND(v_most_recent_max_weight, 2),
        'threshold', v_weight_increase_threshold,
        'increase', ROUND(GREATEST(v_most_recent_avg_weight - v_current_weight, v_most_recent_max_weight - v_current_weight), 2)
      );
    END IF;
  END IF;

  -- Check RIR data for this specific exercise in the last N weeks
  -- RIR >= 5 means exercise is too easy and user should increase weight
  WITH recent_sessions_with_rir AS (
    SELECT DISTINCT
      en.session_id,
      ws.ended_at,
      en.rir_done
    FROM exercise_notes en
    INNER JOIN workout_sessions ws ON ws.id = en.session_id
    WHERE en.client_item_id = p_client_item_id
      AND en.rir_done IS NOT NULL
      AND ws.ended_at IS NOT NULL
      AND ws.ended_at >= NOW() - (p_weeks_back || ' weeks')::INTERVAL
    ORDER BY ws.ended_at DESC
  )
  SELECT 
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE rir_done >= 5) as sessions_with_high_rir,
    AVG(rir_done) as avg_rir,
    MAX(rir_done) as max_rir
  INTO v_session_count, v_sessions_with_high_rir, v_avg_rir, v_max_rir
  FROM recent_sessions_with_rir;

  -- If no RIR data in the time window, check for weight stagnation as fallback
  IF v_session_count = 0 OR v_session_count IS NULL THEN
    -- Fallback: Check if weight has been the same for the last 2 weeks
    WITH recent_sessions AS (
      SELECT 
        ws.id as session_id,
        ws.ended_at,
        AVG(sl.weight_kg_done) as avg_weight_used
      FROM workout_sessions ws
      INNER JOIN set_logs sl ON sl.session_id = ws.id
      WHERE sl.client_item_id = p_client_item_id
        AND ws.ended_at IS NOT NULL
        AND ws.ended_at >= NOW() - (p_weeks_back || ' weeks')::INTERVAL
        AND sl.weight_kg_done IS NOT NULL
      GROUP BY ws.id, ws.ended_at
      ORDER BY ws.ended_at DESC
    )
    SELECT 
      COUNT(*) as sessions_with_same_weight
    INTO v_sessions_without_change
    FROM recent_sessions
    WHERE ABS(avg_weight_used - v_current_weight) < 0.01;

    -- If weight has been the same for 2 weeks, recommend
    IF v_sessions_without_change >= 2 THEN
      RETURN jsonb_build_object(
        'needs_recommendation', true,
        'current_weight', v_current_weight,
        'sessions_without_change', v_sessions_without_change,
        'reason', 'weight_stagnation',
        'message', format(
          'Kaal on olnud %s kg viimased %s nädalat. Soovitame kaalu suurendamist, et näha muutusi!',
          v_current_weight,
          p_weeks_back
        )
      );
    END IF;

    -- No data available
    RETURN jsonb_build_object(
      'needs_recommendation', false,
      'reason', 'insufficient_data',
      'sessions_completed', COALESCE(v_sessions_without_change, 0),
      'weeks_checked', p_weeks_back
    );
  END IF;

  -- If RIR is 5+ (exercise is too easy), recommend weight increase immediately
  -- Check if any recent session had RIR >= 5, or if average RIR is >= 5
  IF v_max_rir >= 5 OR (v_avg_rir >= 5 AND v_session_count >= 1) THEN
    RETURN jsonb_build_object(
      'needs_recommendation', true,
      'current_weight', v_current_weight,
      'sessions_without_change', v_sessions_with_high_rir,
      'avg_rir', ROUND(v_avg_rir, 1),
      'max_rir', v_max_rir,
      'reason', 'high_rir',
      'message', format(
        'RIR (kordustevaru) on viimase %s nädala jooksul olnud %s või rohkem. Harjutus on liiga kerge - soovitame kaalu suurendamist!',
        p_weeks_back,
        CASE WHEN v_max_rir >= 5 THEN v_max_rir::text ELSE ROUND(v_avg_rir, 1)::text END
      )
    );
  END IF;

  -- RIR is acceptable (< 5), no recommendation needed
  RETURN jsonb_build_object(
    'needs_recommendation', false,
    'reason', 'rir_acceptable',
    'avg_rir', ROUND(v_avg_rir, 1),
    'max_rir', v_max_rir,
    'sessions_checked', v_session_count,
    'current_weight', v_current_weight
  );

END;
$$;

-- Create an index to optimize the query performance for RIR-based queries
CREATE INDEX IF NOT EXISTS idx_exercise_notes_client_item_rir 
ON exercise_notes(client_item_id, rir_done, updated_at DESC)
WHERE rir_done IS NOT NULL;

-- Keep existing index for weight-based fallback
CREATE INDEX IF NOT EXISTS idx_set_logs_client_item_weight 
ON set_logs(client_item_id, weight_kg_done)
WHERE weight_kg_done IS NOT NULL;

-- Create index for efficient weight increase detection query
-- Index on set_logs for client_item_id and weight_kg_done (already exists)
-- Additional index on workout_sessions for ended_at lookups (for filtering completed sessions)
CREATE INDEX IF NOT EXISTS idx_workout_sessions_ended_at 
ON workout_sessions(ended_at DESC)
WHERE ended_at IS NOT NULL;

-- Add comment explaining the function
COMMENT ON FUNCTION check_exercise_weight_stagnation IS 
'Checks if an exercise needs weight progression recommendation based on RIR (Reps in Reserve) data. If RIR is 5+ in the last 2 weeks, recommends weight increase immediately. Falls back to weight stagnation detection if no RIR data available. Recommendation disappears if user has increased weight in recent session (2.5% or 0.5kg threshold). Per-exercise basis.';
