-- Fix Function Search Path - Batch 5 (Get Recent Functions)
-- Phase 3: Security Fixes (Function Search Path)

-- get_recent_errors
CREATE OR REPLACE FUNCTION public.get_recent_errors(p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, severity text, category text, message text, stack text, context jsonb, resolved boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        el.id,
        el.severity,
        el.category,
        el.message,
        el.stack,
        el.context,
        el.resolved,
        el.created_at,
        el.updated_at
    FROM public.error_logs el
    ORDER BY el.created_at DESC
    LIMIT p_limit;
END;
$function$;

-- get_recent_progression_analysis_failures
CREATE OR REPLACE FUNCTION public.get_recent_progression_analysis_failures(p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, user_id uuid, session_id uuid, program_id uuid, day_id uuid, exercise_id uuid, failure_type text, error_message text, stack_trace text, analysis_data jsonb, retry_attempts integer, resolved boolean, context jsonb, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        paf.id,
        paf.user_id,
        paf.session_id,
        paf.program_id,
        paf.day_id,
        paf.exercise_id,
        paf.failure_type,
        paf.error_message,
        paf.stack_trace,
        paf.analysis_data,
        paf.retry_attempts,
        paf.resolved,
        paf.context,
        paf.created_at,
        paf.updated_at
    FROM public.progression_analysis_failures paf
    ORDER BY paf.created_at DESC
    LIMIT p_limit;
END;
$function$;

-- get_recent_ux_metrics
CREATE OR REPLACE FUNCTION public.get_recent_ux_metrics(p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, user_id uuid, session_id text, category text, metric_type text, metric_value numeric, metric_unit text, context jsonb, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        um.id,
        um.user_id,
        um.session_id,
        um.category,
        um.metric_type,
        um.metric_value,
        um.metric_unit,
        um.context,
        um.created_at
    FROM public.ux_metrics um
    ORDER BY um.created_at DESC
    LIMIT p_limit;
END;
$function$;

-- get_recent_workout_failures
CREATE OR REPLACE FUNCTION public.get_recent_workout_failures(p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, user_id uuid, session_id uuid, program_id uuid, day_id uuid, failure_type text, error_message text, stack_trace text, retry_attempts integer, resolved boolean, context jsonb, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        wf.id,
        wf.user_id,
        wf.session_id,
        wf.program_id,
        wf.day_id,
        wf.failure_type,
        wf.error_message,
        wf.stack_trace,
        wf.retry_attempts,
        wf.resolved,
        wf.context,
        wf.created_at,
        wf.updated_at
    FROM public.workout_failures wf
    ORDER BY wf.created_at DESC
    LIMIT p_limit;
END;
$function$;

-- get_ux_metrics_by_category
CREATE OR REPLACE FUNCTION public.get_ux_metrics_by_category(p_category text, p_limit integer DEFAULT 100)
 RETURNS TABLE(id uuid, user_id uuid, session_id text, metric_type text, metric_value numeric, metric_unit text, context jsonb, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        um.id,
        um.user_id,
        um.session_id,
        um.metric_type,
        um.metric_value,
        um.metric_unit,
        um.context,
        um.created_at
    FROM public.ux_metrics um
    WHERE um.category = p_category
    ORDER BY um.created_at DESC
    LIMIT p_limit;
END;
$function$;

-- get_ux_metrics_stats
CREATE OR REPLACE FUNCTION public.get_ux_metrics_stats()
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
        'by_category', jsonb_build_object(
            'engagement', COUNT(*) FILTER (WHERE category = 'engagement'),
            'performance', COUNT(*) FILTER (WHERE category = 'performance'),
            'usability', COUNT(*) FILTER (WHERE category = 'usability'),
            'satisfaction', COUNT(*) FILTER (WHERE category = 'satisfaction'),
            'conversion', COUNT(*) FILTER (WHERE category = 'conversion'),
            'retention', COUNT(*) FILTER (WHERE category = 'retention'),
            'error_recovery', COUNT(*) FILTER (WHERE category = 'error_recovery'),
            'mobile_experience', COUNT(*) FILTER (WHERE category = 'mobile_experience')
        ),
        'by_type', jsonb_build_object(
            'page_view', COUNT(*) FILTER (WHERE metric_type = 'page_view'),
            'session_duration', COUNT(*) FILTER (WHERE metric_type = 'session_duration'),
            'feature_usage', COUNT(*) FILTER (WHERE metric_type = 'feature_usage'),
            'load_time', COUNT(*) FILTER (WHERE metric_type = 'load_time'),
            'api_response_time', COUNT(*) FILTER (WHERE metric_type = 'api_response_time'),
            'task_completion_rate', COUNT(*) FILTER (WHERE metric_type = 'task_completion_rate'),
            'error_rate', COUNT(*) FILTER (WHERE metric_type = 'error_rate'),
            'rating', COUNT(*) FILTER (WHERE metric_type = 'rating'),
            'trial_conversion', COUNT(*) FILTER (WHERE metric_type = 'trial_conversion'),
            'touch_interaction', COUNT(*) FILTER (WHERE metric_type = 'touch_interaction')
        ),
        'last_24h', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours'),
        'last_7d', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days'),
        'avg_metric_values', jsonb_build_object(
            'avg_load_time', AVG(metric_value) FILTER (WHERE metric_type = 'load_time'),
            'avg_response_time', AVG(metric_value) FILTER (WHERE metric_type = 'api_response_time'),
            'avg_session_duration', AVG(metric_value) FILTER (WHERE metric_type = 'session_duration'),
            'avg_rating', AVG(metric_value) FILTER (WHERE metric_type = 'rating')
        )
    )
    INTO result
    FROM public.ux_metrics;
    
    RETURN result;
END;
$function$;
