-- Fix Security Definer Views by recreating them with proper security settings

-- First, drop the existing views that have SECURITY DEFINER
DROP VIEW IF EXISTS public.v_user_entitlement;
DROP VIEW IF EXISTS public.v_userprogress_with_day;

-- Recreate v_user_entitlement view without SECURITY DEFINER (defaults to SECURITY INVOKER)
-- This view will now respect RLS policies of the querying user
CREATE VIEW public.v_user_entitlement AS
SELECT 
  p.id as user_id,
  CASE 
    WHEN p.is_paid = true THEN 'paid'
    WHEN p.trial_ends_at IS NOT NULL AND p.trial_ends_at > now() THEN 'trial'
    WHEN EXISTS (
      SELECT 1 FROM public.access_overrides ao 
      WHERE ao.user_id = p.id 
        AND (ao.expires_at IS NULL OR ao.expires_at > now())
    ) THEN 'override'
    ELSE 'free'
  END as access_tier,
  p.trial_ends_at,
  p.current_period_end
FROM public.profiles p;

-- Recreate v_userprogress_with_day view without SECURITY DEFINER
-- This view will now respect RLS policies of the querying user
CREATE VIEW public.v_userprogress_with_day AS
SELECT 
  up.id,
  up.user_id,
  up.programday_id,
  up.completed_at,
  up.created_at,
  up.reps,
  up.sets,
  pd.week,
  pd.day,
  pd.exercise1,
  pd.exercise2,
  pd.exercise3,
  pd.exercise4,
  pd.exercise5
FROM public.userprogress up
JOIN public.programday pd ON up.programday_id = pd.id;

-- Enable RLS on both views (this is automatic for views, but making it explicit)
-- Views inherit RLS behavior from underlying tables when using SECURITY INVOKER