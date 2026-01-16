-- Fix Function Search Path - Batch 6 (Final Functions: Stats, Admin, Mark Resolved)
-- Phase 3: Security Fixes (Function Search Path)

-- get_workout_failure_stats
CREATE OR REPLACE FUNCTION public.get_workout_failure_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total', COUNT(*),
        'by_type', jsonb_build_object(
            'session_end_failed', COUNT(*) FILTER (WHERE failure_type = 'session_end_failed'),
            'progression_analysis_failed', COUNT(*) FILTER (WHERE failure_type = 'progression_analysis_failed'),
            'data_save_failed', COUNT(*) FILTER (WHERE failure_type = 'data_save_failed'),
            'network_error', COUNT(*) FILTER (WHERE failure_type = 'network_error'),
            'permission_error', COUNT(*) FILTER (WHERE failure_type = 'permission_error'),
            'validation_error', COUNT(*) FILTER (WHERE failure_type = 'validation_error'),
            'unknown_error', COUNT(*) FILTER (WHERE failure_type = 'unknown_error')
        ),
        'unresolved', COUNT(*) FILTER (WHERE resolved = false),
        'last_24h', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours'),
        'last_7d', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')
    )
    INTO result
    FROM public.workout_failures;
    
    RETURN result;
END;
$function$;

-- is_admin_unified
CREATE OR REPLACE FUNCTION public.is_admin_unified()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  current_user_id uuid;
  is_admin_user boolean := false;
BEGIN
  -- Get current user ID from JWT token
  current_user_id := auth.uid();
  
  -- If no user, not admin
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check profiles table first (most reliable)
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE id = current_user_id 
    AND role = 'admin'
  ) INTO is_admin_user;
  
  -- If not found in profiles, check user_roles table
  IF NOT is_admin_user THEN
    SELECT EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = current_user_id 
      AND role = 'admin'
    ) INTO is_admin_user;
  END IF;
  
  -- If still not found, check access_overrides (temporary admin access)
  IF NOT is_admin_user THEN
    SELECT EXISTS(
      SELECT 1 FROM public.access_overrides 
      WHERE user_id = current_user_id 
      AND (expires_at IS NULL OR expires_at > now())
    ) INTO is_admin_user;
  END IF;
  
  RETURN COALESCE(is_admin_user, false);
END;
$function$;

-- mark_error_resolved
CREATE OR REPLACE FUNCTION public.mark_error_resolved(p_error_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
    UPDATE public.error_logs
    SET resolved = true, updated_at = NOW()
    WHERE id = p_error_id;
    
    RETURN FOUND;
END;
$function$;

-- mark_progression_analysis_failure_resolved
CREATE OR REPLACE FUNCTION public.mark_progression_analysis_failure_resolved(p_failure_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
    UPDATE public.progression_analysis_failures
    SET resolved = true, updated_at = NOW()
    WHERE id = p_failure_id;
    
    RETURN FOUND;
END;
$function$;

-- mark_workout_failure_resolved
CREATE OR REPLACE FUNCTION public.mark_workout_failure_resolved(p_failure_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
    UPDATE public.workout_failures
    SET resolved = true, updated_at = NOW()
    WHERE id = p_failure_id;
    
    RETURN FOUND;
END;
$function$;
