-- Fix Function Search Path - Batch 1 (Admin Functions)
-- Phase 3: Security Fixes (Function Search Path)
-- 
-- This migration adds SET search_path to SECURITY DEFINER functions
-- to prevent schema hijacking attacks.
--
-- Risk: 🟡 MEDIUM - Could break if functions reference tables incorrectly
-- Impact: 🔴 CRITICAL - Security vulnerability fix
--
-- Generated: 2025-01-16
-- Validated: ✅ 31 functions identified for fixing

-- ============================================================================
-- FIX ADMIN FUNCTIONS (Batch 1)
-- ============================================================================

-- admin_delete_client_program_cascade
CREATE OR REPLACE FUNCTION public.admin_delete_client_program_cascade(p_program_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
    v_deleted_sessions int := 0;
    v_deleted_items int := 0;
    v_deleted_days int := 0;
    v_deleted_streaks int := 0;
BEGIN
    -- Only admins can delete programs
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'forbidden: admin access required';
    END IF;

    -- Delete user_streaks first to avoid foreign key constraint issues
    WITH deleted_streaks AS (
        DELETE FROM public.user_streaks 
        WHERE user_id IN (
            SELECT assigned_to FROM public.client_programs WHERE id = p_program_id
        )
        RETURNING id
    )
    SELECT count(*) INTO v_deleted_streaks FROM deleted_streaks;

    -- Delete workout sessions (this will cascade to set_logs, rest_timers)
    WITH deleted_sessions AS (
        DELETE FROM public.workout_sessions 
        WHERE client_program_id = p_program_id 
        RETURNING id
    )
    SELECT count(*) INTO v_deleted_sessions FROM deleted_sessions;

    -- Delete client structure
    WITH deleted_items AS (
        DELETE FROM public.client_items 
        WHERE client_day_id IN (
            SELECT id FROM public.client_days WHERE client_program_id = p_program_id
        )
        RETURNING id
    )
    SELECT count(*) INTO v_deleted_items FROM deleted_items;

    WITH deleted_days AS (
        DELETE FROM public.client_days 
        WHERE client_program_id = p_program_id 
        RETURNING id
    )
    SELECT count(*) INTO v_deleted_days FROM deleted_days;

    -- Finally delete the program
    DELETE FROM public.client_programs WHERE id = p_program_id;

    RETURN jsonb_build_object(
        'success', true,
        'deleted_sessions', v_deleted_sessions,
        'deleted_days', v_deleted_days,
        'deleted_items', v_deleted_items,
        'deleted_streaks', v_deleted_streaks
    );
END;
$function$;

-- admin_get_access_matrix
CREATE OR REPLACE FUNCTION public.admin_get_access_matrix()
 RETURNS TABLE(user_id uuid, is_admin boolean, can_static boolean, can_pt boolean, reason text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT * FROM public.v_access_matrix;
$function$;

-- admin_get_users
CREATE OR REPLACE FUNCTION public.admin_get_users()
 RETURNS TABLE(id uuid, email text, role text, created_at timestamp with time zone, is_paid boolean, trial_ends_at timestamp with time zone, current_period_end timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT 
    au.id,
    au.email,
    COALESCE(p.role, 'user') as role,
    au.created_at,
    COALESCE(s.status = 'active', false) as is_paid,
    s.trial_ends_at,
    s.expires_at as current_period_end
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  LEFT JOIN public.subscribers s ON s.user_id = au.id AND s.status = 'active'
  ORDER BY au.created_at DESC;
$function$;

-- admin_test
CREATE OR REPLACE FUNCTION public.admin_test()
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT 'Admin test successful'::text;
$function$;

-- check_admin_access
CREATE OR REPLACE FUNCTION public.check_admin_access()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- If no authenticated user, not admin
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user has admin role in profiles table
  RETURN EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE id = current_user_id 
    AND role = 'admin'
  );
END;
$function$;

-- cleanup_orphaned_programs
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_programs()
 RETURNS TABLE(program_id uuid, assigned_to uuid, action_taken text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  -- This function identifies orphaned programs but doesn't delete them automatically
  -- Admin should review and decide what to do with them
  SELECT 
    cp.id as program_id,
    cp.assigned_to,
    CASE 
      WHEN p.id IS NULL THEN 'ORPHANED - User deleted'
      ELSE 'OK'
    END as action_taken
  FROM public.client_programs cp
  LEFT JOIN public.profiles p ON cp.assigned_to = p.id
  WHERE p.id IS NULL;
$function$;
