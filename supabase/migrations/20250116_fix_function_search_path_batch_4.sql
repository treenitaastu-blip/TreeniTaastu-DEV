-- Fix Function Search Path - Batch 4 (Get Stats Functions)
-- Phase 3: Security Fixes (Function Search Path)

-- get_error_stats
CREATE OR REPLACE FUNCTION public.get_error_stats()
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
        'by_severity', jsonb_build_object(
            'low', COUNT(*) FILTER (WHERE severity = 'low'),
            'medium', COUNT(*) FILTER (WHERE severity = 'medium'),
            'high', COUNT(*) FILTER (WHERE severity = 'high'),
            'critical', COUNT(*) FILTER (WHERE severity = 'critical')
        ),
        'by_category', jsonb_build_object(
            'auth', COUNT(*) FILTER (WHERE category = 'auth'),
            'database', COUNT(*) FILTER (WHERE category = 'database'),
            'network', COUNT(*) FILTER (WHERE category = 'network'),
            'validation', COUNT(*) FILTER (WHERE category = 'validation'),
            'workout', COUNT(*) FILTER (WHERE category = 'workout'),
            'progression', COUNT(*) FILTER (WHERE category = 'progression'),
            'payment', COUNT(*) FILTER (WHERE category = 'payment'),
            'ui', COUNT(*) FILTER (WHERE category = 'ui'),
            'system', COUNT(*) FILTER (WHERE category = 'system')
        ),
        'unresolved', COUNT(*) FILTER (WHERE resolved = false),
        'last_24h', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours'),
        'last_7d', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')
    )
    INTO result
    FROM public.error_logs;
    
    RETURN result;
END;
$function$;

-- get_exercise_alternatives
CREATE OR REPLACE FUNCTION public.get_exercise_alternatives(p_exercise_id uuid)
 RETURNS TABLE(id uuid, alternative_name text, alternative_description text, alternative_video_url text, difficulty_level text, equipment_required text[], muscle_groups text[])
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT 
    ea.id,
    ea.alternative_name,
    ea.alternative_description,
    ea.alternative_video_url,
    ea.difficulty_level,
    ea.equipment_required,
    ea.muscle_groups
  FROM public.exercise_alternatives ea
  WHERE ea.primary_exercise_id = p_exercise_id
  ORDER BY ea.difficulty_level, ea.alternative_name;
$function$;

-- get_program_progress
CREATE OR REPLACE FUNCTION public.get_program_progress(p_program_id uuid)
 RETURNS TABLE(program_id uuid, user_id uuid, start_date date, duration_weeks integer, auto_progression_enabled boolean, status text, completed_at timestamp with time zone, weeks_elapsed numeric, progress_percentage numeric, is_due_for_completion boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  current_user_role TEXT;
  is_assigned_user BOOLEAN;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  -- Check if user is assigned to this program
  SELECT (assigned_to = auth.uid()) INTO is_assigned_user
  FROM public.client_programs 
  WHERE id = p_program_id;
  
  -- Allow access if user is assigned to program OR if user is admin
  IF NOT (is_assigned_user OR current_user_role = 'admin') THEN
    RAISE EXCEPTION 'Access denied to program %', p_program_id;
  END IF;

  -- Return the progress data
  RETURN QUERY
  SELECT 
    vpp.program_id,
    vpp.user_id,
    vpp.start_date,
    vpp.duration_weeks,
    vpp.auto_progression_enabled,
    vpp.status,
    vpp.completed_at,
    vpp.weeks_elapsed,
    vpp.progress_percentage,
    vpp.is_due_for_completion
  FROM public.v_program_progress vpp
  WHERE vpp.program_id = p_program_id;
END;
$function$;

-- get_progression_analysis_failure_stats
CREATE OR REPLACE FUNCTION public.get_progression_analysis_failure_stats()
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
            'analysis_function_error', COUNT(*) FILTER (WHERE failure_type = 'analysis_function_error'),
            'data_validation_error', COUNT(*) FILTER (WHERE failure_type = 'data_validation_error'),
            'permission_error', COUNT(*) FILTER (WHERE failure_type = 'permission_error'),
            'network_error', COUNT(*) FILTER (WHERE failure_type = 'network_error'),
            'timeout_error', COUNT(*) FILTER (WHERE failure_type = 'timeout_error'),
            'insufficient_data', COUNT(*) FILTER (WHERE failure_type = 'insufficient_data'),
            'calculation_error', COUNT(*) FILTER (WHERE failure_type = 'calculation_error'),
            'unknown_error', COUNT(*) FILTER (WHERE failure_type = 'unknown_error')
        ),
        'unresolved', COUNT(*) FILTER (WHERE resolved = false),
        'last_24h', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours'),
        'last_7d', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')
    )
    INTO result
    FROM public.progression_analysis_failures;
    
    RETURN result;
END;
$function$;

-- get_pt_system_stats
CREATE OR REPLACE FUNCTION public.get_pt_system_stats()
 RETURNS TABLE(total_programs integer, active_programs integer, total_templates integer, active_templates integer, orphaned_programs integer, programs_with_missing_users integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM public.client_programs) as total_programs,
    (SELECT COUNT(*)::INTEGER FROM public.client_programs WHERE is_active = true) as active_programs,
    (SELECT COUNT(*)::INTEGER FROM public.workout_templates) as total_templates,
    (SELECT COUNT(*)::INTEGER FROM public.workout_templates WHERE is_active = true) as active_templates,
    (SELECT COUNT(*)::INTEGER FROM public.client_programs cp LEFT JOIN public.profiles p ON cp.assigned_to = p.id WHERE p.id IS NULL) as orphaned_programs,
    (SELECT COUNT(*)::INTEGER FROM public.client_programs cp LEFT JOIN public.profiles p ON cp.assigned_to = p.id WHERE p.id IS NULL) as programs_with_missing_users;
$function$;

-- get_random_motivational_quote
CREATE OR REPLACE FUNCTION public.get_random_motivational_quote()
 RETURNS TABLE(quote text, author text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT mq.quote, mq.author
  FROM public.motivational_quotes mq
  ORDER BY RANDOM()
  LIMIT 1;
END;
$function$;
