-- Fix Function Search Path - Batch 3 (Analysis and Get Functions)
-- Phase 3: Security Fixes (Function Search Path)

-- analyze_exercise_progression_enhanced
CREATE OR REPLACE FUNCTION public.analyze_exercise_progression_enhanced(p_client_item_id uuid, p_weeks_back integer DEFAULT 4)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
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
  FROM public.client_items ci
  WHERE ci.id = p_client_item_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error', 'Exercise not found',
      'exercise_id', p_client_item_id
    );
  END IF;
  
  v_current_weight := v_exercise_data.weight_kg;
  v_current_reps := v_exercise_data.reps;

  -- Analyze recent performance with simplified aggregation
  WITH recent_performance AS (
    SELECT 
      ws.started_at::date as session_date,
      en.rpe,
      AVG(sl.weight_kg_done * sl.reps_done) as session_volume,
      COUNT(sl.id) as sets_completed
    FROM public.workout_sessions ws
    LEFT JOIN public.exercise_notes en ON en.session_id = ws.id AND en.client_item_id = p_client_item_id
    LEFT JOIN public.set_logs sl ON sl.session_id = ws.id AND sl.client_item_id = p_client_item_id
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
      SUM(session_volume) as total_volume
    FROM recent_performance
  )
  SELECT 
    COALESCE(ps.session_count, 0),
    COALESCE(ps.avg_rpe, 7),
    COALESCE(ps.rpe_variance, 0),
    COALESCE(ps.avg_volume, 0),
    COALESCE(ps.total_volume, 0)
  INTO v_session_count, v_avg_rpe, v_rpe_variance, v_total_volume, v_total_volume
  FROM performance_stats ps;
  
  -- Calculate consistency score
  v_consistency_score := CASE 
    WHEN v_rpe_variance IS NULL OR v_rpe_variance = 0 THEN 1.0
    ELSE GREATEST(0, 1 - (v_rpe_variance / 3))
  END;
  
  -- Set RPE trend to 0 for now (simplified)
  v_rpe_trend := 0;
  
  -- Professional progression logic
  IF v_session_count < 2 THEN
    v_recommendation := 'maintain';
    v_suggested_weight := v_current_weight;
    v_confidence_score := 0.3;
  ELSIF v_avg_rpe < 6.5 AND v_consistency_score > 0.7 THEN
    -- Too easy + consistent = increase intensity
    v_recommendation := 'increase_weight';
    v_suggested_weight := CASE 
      WHEN v_current_weight IS NOT NULL THEN 
        ROUND(v_current_weight * 1.05, 1) -- 5% increase
      ELSE NULL
    END;
    v_confidence_score := 0.8;
  ELSIF v_avg_rpe > 8.5 THEN
    -- Too hard = decrease intensity
    v_recommendation := 'decrease_weight';
    v_suggested_weight := CASE 
      WHEN v_current_weight IS NOT NULL THEN 
        ROUND(v_current_weight * 0.95, 1) -- 5% decrease
      ELSE NULL
    END;
    v_confidence_score := 0.9;
  ELSIF v_avg_rpe BETWEEN 6.5 AND 8.5 AND v_consistency_score > 0.6 THEN
    -- In target zone + consistent = maintain
    v_recommendation := 'maintain';
    v_suggested_weight := v_current_weight;
    v_confidence_score := 0.8;
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
      WHEN 'increase_weight' THEN 'RPE too low - exercise is too easy'
      WHEN 'decrease_weight' THEN 'RPE too high - exercise is too challenging'
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

-- get_admin_access_matrix
CREATE OR REPLACE FUNCTION public.get_admin_access_matrix()
 RETURNS TABLE(user_id uuid, is_admin boolean, can_static boolean, can_pt boolean, reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  current_user_id uuid;
  is_admin_user boolean := false;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- If no user, deny access
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: No authenticated user';
  END IF;
  
  -- Check if user is admin
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = current_user_id 
    AND profiles.role = 'admin'
  ) INTO is_admin_user;
  
  IF NOT is_admin_user THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Return access matrix (bypasses RLS)
  RETURN QUERY
  SELECT 
    v_access_matrix.user_id,
    v_access_matrix.is_admin,
    v_access_matrix.can_static,
    v_access_matrix.can_pt,
    v_access_matrix.reason
  FROM public.v_access_matrix;
END;
$function$;

-- get_admin_entitlements
CREATE OR REPLACE FUNCTION public.get_admin_entitlements()
 RETURNS TABLE(user_id uuid, product text, status text, trial_ends_at timestamp with time zone, expires_at timestamp with time zone, paused boolean, source text, note text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  current_user_id uuid;
  is_admin_user boolean := false;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- If no user, deny access
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: No authenticated user';
  END IF;
  
  -- Check if user is admin
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = current_user_id 
    AND profiles.role = 'admin'
  ) INTO is_admin_user;
  
  IF NOT is_admin_user THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Return entitlements (bypasses RLS)
  RETURN QUERY
  SELECT 
    user_entitlements.user_id,
    user_entitlements.product::text,
    user_entitlements.status,
    user_entitlements.trial_ends_at,
    user_entitlements.expires_at,
    user_entitlements.paused,
    user_entitlements.source,
    user_entitlements.note,
    user_entitlements.created_at
  FROM public.user_entitlements
  ORDER BY user_entitlements.created_at DESC;
END;
$function$;

-- get_admin_users
CREATE OR REPLACE FUNCTION public.get_admin_users()
 RETURNS TABLE(id uuid, email text, role text, created_at timestamp with time zone, is_paid boolean, trial_ends_at timestamp with time zone, current_period_end timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  current_user_id uuid;
  is_admin_user boolean := false;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- If no user, deny access
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: No authenticated user';
  END IF;
  
  -- Check if user is admin (multiple sources)
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = current_user_id 
    AND profiles.role = 'admin'
  ) INTO is_admin_user;
  
  -- If not found in profiles, check user_roles
  IF NOT is_admin_user THEN
    SELECT EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = current_user_id 
      AND user_roles.role = 'admin'
    ) INTO is_admin_user;
  END IF;
  
  -- If still not admin, deny access
  IF NOT is_admin_user THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Return admin data (bypasses RLS due to SECURITY DEFINER)
  RETURN QUERY
  SELECT 
    profiles.id,
    profiles.email,
    COALESCE(profiles.role, 'user') as role,
    profiles.created_at,
    COALESCE(subscribers.status = 'active', false) as is_paid,
    subscribers.trial_ends_at,
    subscribers.expires_at as current_period_end
  FROM public.profiles
  LEFT JOIN public.subscribers ON subscribers.user_id = profiles.id
  ORDER BY profiles.created_at DESC;
END;
$function$;

-- get_all_users
CREATE OR REPLACE FUNCTION public.get_all_users()
 RETURNS TABLE(id uuid, email text, full_name text, created_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.created_at
  FROM public.profiles p
  WHERE p.email IS NOT NULL
  ORDER BY p.created_at DESC;
$function$;
