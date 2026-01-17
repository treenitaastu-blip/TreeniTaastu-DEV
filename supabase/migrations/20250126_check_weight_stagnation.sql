-- Function to check if an exercise has been using the same weight for N+ sessions
-- Returns recommendation data if weight hasn't changed for the specified number of sessions
CREATE OR REPLACE FUNCTION check_exercise_weight_stagnation(
  p_client_item_id UUID,
  p_min_sessions_without_change INTEGER DEFAULT 4
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_weight NUMERIC;
  v_session_count INTEGER;
  v_sessions_with_same_weight INTEGER := 0;
  v_last_changed_weight NUMERIC;
  v_recent_sessions RECORD;
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

  -- Get completed workout sessions for this exercise, ordered by most recent
  -- We need to check distinct sessions where the exercise was actually performed
  -- by looking at set_logs with weight_kg_done
  SELECT 
    COUNT(DISTINCT ws.id) as total_sessions,
    COUNT(DISTINCT CASE 
      WHEN sl.weight_kg_done IS NOT NULL AND ABS(sl.weight_kg_done - v_current_weight) < 0.01 
      THEN ws.id 
    END) as sessions_with_same_weight
  INTO v_session_count, v_sessions_with_same_weight
  FROM workout_sessions ws
  INNER JOIN set_logs sl ON sl.session_id = ws.id
  WHERE sl.client_item_id = p_client_item_id
    AND ws.ended_at IS NOT NULL
    AND sl.weight_kg_done IS NOT NULL
  ORDER BY ws.ended_at DESC
  LIMIT (p_min_sessions_without_change + 5); -- Check a few extra to be safe

  -- If we don't have enough session data, don't recommend
  IF v_session_count < p_min_sessions_without_change THEN
    RETURN jsonb_build_object(
      'needs_recommendation', false,
      'reason', 'insufficient_data',
      'sessions_completed', v_session_count,
      'required_sessions', p_min_sessions_without_change
    );
  END IF;

  -- Check if the last N sessions all used the same weight (within 0.01kg tolerance)
  -- by looking at the average weight per session
  WITH recent_sessions AS (
    SELECT 
      ws.id as session_id,
      ws.ended_at,
      AVG(sl.weight_kg_done) as avg_weight_used,
      COUNT(*) as sets_completed
    FROM workout_sessions ws
    INNER JOIN set_logs sl ON sl.session_id = ws.id
    WHERE sl.client_item_id = p_client_item_id
      AND ws.ended_at IS NOT NULL
      AND sl.weight_kg_done IS NOT NULL
    GROUP BY ws.id, ws.ended_at
    ORDER BY ws.ended_at DESC
    LIMIT p_min_sessions_without_change
  )
  SELECT 
    COUNT(*) as sessions_with_same_weight
  INTO v_sessions_with_same_weight
  FROM recent_sessions
  WHERE ABS(avg_weight_used - v_current_weight) < 0.01;

  -- If all recent sessions used the same weight, recommend progression
  IF v_sessions_with_same_weight >= p_min_sessions_without_change THEN
    RETURN jsonb_build_object(
      'needs_recommendation', true,
      'current_weight', v_current_weight,
      'sessions_without_change', v_sessions_with_same_weight,
      'min_sessions_required', p_min_sessions_without_change,
      'message', format(
        'Kaal on olnud %s kg viimased %s treeningut. Soovitame kaalu suurendamist, et näha muutusi!',
        v_current_weight,
        v_sessions_with_same_weight
      )
    );
  END IF;

  -- Weight has changed recently, no recommendation needed
  RETURN jsonb_build_object(
    'needs_recommendation', false,
    'reason', 'weight_changed_recently',
    'sessions_checked', v_sessions_with_same_weight,
    'current_weight', v_current_weight
  );

END;
$$;

-- Create an index to optimize the query performance
CREATE INDEX IF NOT EXISTS idx_set_logs_client_item_weight 
ON set_logs(client_item_id, weight_kg_done)
WHERE weight_kg_done IS NOT NULL;

-- Add comment explaining the function
COMMENT ON FUNCTION check_exercise_weight_stagnation IS 
'Checks if an exercise weight has been the same for N+ completed workout sessions. Returns recommendation data if weight stagnation is detected.';
