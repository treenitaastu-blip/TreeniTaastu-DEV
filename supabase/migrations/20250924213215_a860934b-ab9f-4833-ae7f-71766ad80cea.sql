-- Fix Security Definer Views by adding SECURITY INVOKER option
-- This ensures views respect RLS policies of the querying user rather than the view creator

-- Drop all views first to handle dependencies
DROP VIEW IF EXISTS public.v_user_weekly CASCADE;
DROP VIEW IF EXISTS public.v_userprogress_with_day CASCADE;  
DROP VIEW IF EXISTS public.v_user_entitlement CASCADE;
DROP VIEW IF EXISTS public.v_static_status CASCADE;
DROP VIEW IF EXISTS public.v_session_summary CASCADE;
DROP VIEW IF EXISTS public.v_program_analytics CASCADE;
DROP VIEW IF EXISTS public.v_client_programs_admin CASCADE;
DROP VIEW IF EXISTS public.v_access_matrix CASCADE;

-- Recreate all views with security_invoker=on

-- 1. v_access_matrix
CREATE VIEW public.v_access_matrix 
WITH (security_invoker=on)
AS
SELECT 
    id AS user_id,
    ((role = 'admin'::text) OR (EXISTS ( SELECT 1
           FROM access_overrides ao
          WHERE (ao.user_id = p.id)))) AS is_admin,
        CASE
            WHEN (role = 'admin'::text) THEN true
            WHEN (EXISTS ( SELECT 1
               FROM access_overrides ao
              WHERE ((ao.user_id = p.id) AND ((ao.product = 'static'::product_kind) OR (ao.product IS NULL))))) THEN true
            WHEN (EXISTS ( SELECT 1
               FROM user_entitlements ue
              WHERE ((ue.user_id = p.id) AND (ue.product = 'static'::product_kind) AND (ue.status = ANY (ARRAY['active'::text, 'trialing'::text])) AND ((ue.expires_at IS NULL) OR (ue.expires_at > now())) AND (NOT ue.paused)))) THEN true
            ELSE false
        END AS can_static,
        CASE
            WHEN (role = 'admin'::text) THEN true
            WHEN (EXISTS ( SELECT 1
               FROM access_overrides ao
              WHERE ((ao.user_id = p.id) AND ((ao.product = 'pt'::product_kind) OR (ao.product IS NULL))))) THEN true
            WHEN (EXISTS ( SELECT 1
               FROM user_entitlements ue
              WHERE ((ue.user_id = p.id) AND (ue.product = 'pt'::product_kind) AND (ue.status = ANY (ARRAY['active'::text, 'trialing'::text])) AND ((ue.expires_at IS NULL) OR (ue.expires_at > now())) AND (NOT ue.paused)))) THEN true
            ELSE false
        END AS can_pt,
    'database_view'::text AS reason
FROM profiles p;

-- 2. v_client_programs_admin  
CREATE VIEW public.v_client_programs_admin 
WITH (security_invoker=on)
AS
SELECT 
    cp.id,
    cp.template_id,
    cp.assigned_to,
    cp.assigned_by,
    cp.start_date,
    cp.is_active,
    cp.inserted_at,
    p.email AS assigned_to_email,
    t.title AS template_title
FROM ((client_programs cp
     LEFT JOIN profiles p ON ((p.id = cp.assigned_to)))
     LEFT JOIN workout_templates t ON ((t.id = cp.template_id)));

-- 3. v_program_analytics
CREATE VIEW public.v_program_analytics 
WITH (security_invoker=on)
AS
SELECT 
    count(DISTINCT user_id) AS total_users,
    count(id) AS total_completions,
    count(DISTINCT programday_id) AS unique_days_completed,
    avg(
        CASE
            WHEN (user_id IN ( SELECT userprogress.user_id
               FROM userprogress
              GROUP BY userprogress.user_id
             HAVING (count(*) >= 20))) THEN 1.0
            ELSE 0.0
        END) AS completion_rate,
    ( SELECT pd.day
           FROM (( SELECT up2.programday_id,
                    count(*) AS completions
                   FROM userprogress up2
                  WHERE (NOT (up2.user_id IN ( SELECT userprogress.user_id
                           FROM userprogress
                          GROUP BY userprogress.user_id
                         HAVING (count(*) >= 20))))
                  GROUP BY up2.programday_id
                  ORDER BY (count(*)) DESC
                 LIMIT 1) last_days
             JOIN programday pd ON ((pd.id = last_days.programday_id)))) AS most_common_dropoff_day
FROM userprogress up;

-- 4. v_session_summary
CREATE VIEW public.v_session_summary 
WITH (security_invoker=on)
AS
SELECT 
    ws.id AS session_id,
    ws.user_id,
    ws.started_at,
    ws.ended_at,
    ws.duration_minutes,
    COALESCE(sl.total_reps, (0)::bigint) AS total_reps,
    COALESCE(sl.total_volume_kg, (0)::numeric) AS total_volume_kg,
    COALESCE(sl.exercises_completed, (0)::bigint) AS exercises_completed,
    COALESCE(sl.sets_completed, (0)::bigint) AS sets_completed,
    sl.avg_rpe
FROM (workout_sessions ws
     LEFT JOIN ( SELECT sl_1.session_id,
            sum(COALESCE(sl_1.reps_done, 0)) AS total_reps,
            sum((COALESCE(sl_1.weight_kg_done, (0)::numeric) * (COALESCE(sl_1.reps_done, 0))::numeric)) AS total_volume_kg,
            count(DISTINCT sl_1.client_item_id) AS exercises_completed,
            count(*) AS sets_completed,
            ( SELECT avg(en.rpe) AS avg
                   FROM exercise_notes en
                  WHERE ((en.session_id = sl_1.session_id) AND (en.rpe IS NOT NULL))) AS avg_rpe
           FROM set_logs sl_1
          GROUP BY sl_1.session_id) sl ON ((ws.id = sl.session_id)));

-- 5. v_static_status
CREATE VIEW public.v_static_status 
WITH (security_invoker=on)
AS
SELECT 
    p.id AS user_id,
    (ss.start_monday IS NOT NULL) AS is_started,
    (ss.start_monday)::text AS start_monday,
        CASE
            WHEN (ss.start_monday IS NULL) THEN NULL::uuid
            ELSE ( SELECT pd.id
               FROM programday pd
              WHERE ((pd.week = 1) AND (pd.day = 1))
             LIMIT 1)
        END AS current_programday_id,
        CASE
            WHEN (ss.start_monday IS NULL) THEN 0
            ELSE (((date_part('days'::text, (now() - (ss.start_monday)::timestamp with time zone)) / (7)::double precision))::integer + 1)
        END AS current_week,
        CASE
            WHEN (ss.start_monday IS NULL) THEN 0
            ELSE (((date_part('dow'::text, now()) + (6)::double precision))::integer % 7)
        END AS current_day_of_week,
        CASE
            WHEN (ss.start_monday IS NULL) THEN NULL::text
            ELSE 'static'::text
        END AS program_type
FROM (profiles p
     LEFT JOIN static_starts ss ON ((ss.user_id = p.id)));

-- 6. v_user_entitlement
CREATE VIEW public.v_user_entitlement 
WITH (security_invoker=on)
AS
SELECT 
    ue.user_id,
    ue.product,
    ue.status,
    ue.started_at,
    ue.trial_ends_at,
    ue.expires_at,
    ue.paused,
    ue.source,
    ue.note,
    ue.created_at,
    ue.updated_at,
        CASE
            WHEN ue.paused THEN false
            WHEN ((ue.status = 'trialing'::text) AND (COALESCE(ue.trial_ends_at, '-infinity'::timestamp with time zone) > now())) THEN true
            WHEN ((ue.status = 'active'::text) AND ((ue.expires_at IS NULL) OR (ue.expires_at > now()))) THEN true
            ELSE false
        END AS is_active
FROM user_entitlements ue;

-- 7. v_user_weekly  
CREATE VIEW public.v_user_weekly 
WITH (security_invoker=on)
AS
SELECT 
    ws.user_id,
    get_iso_week(ws.started_at) AS iso_week,
    count(*) AS sessions_count,
    count(*) FILTER (WHERE (ws.ended_at IS NOT NULL)) AS completed_sessions,
    sum(COALESCE(ws.duration_minutes, 0)) AS total_minutes,
    avg(COALESCE(ws.duration_minutes, 0)) AS avg_minutes_per_session
FROM workout_sessions ws
GROUP BY ws.user_id, (get_iso_week(ws.started_at));

-- 8. v_userprogress_with_day
CREATE VIEW public.v_userprogress_with_day 
WITH (security_invoker=on)
AS
SELECT 
    up.*,
    pd.week,
    pd.day,
    pd.title AS day_title
FROM (userprogress up
     JOIN programday pd ON ((pd.id = up.programday_id)));