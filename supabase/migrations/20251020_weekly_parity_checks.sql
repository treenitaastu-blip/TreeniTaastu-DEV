-- Helper functions to double-check weekly analytics parity

-- Compare weekly volume (kg) between v_user_weekly_extended and recomputed from set_logs
DROP FUNCTION IF EXISTS public.verify_weekly_volume_parity(p_user_id uuid, p_weeks int);
CREATE OR REPLACE FUNCTION public.verify_weekly_volume_parity(p_user_id uuid, p_weeks int DEFAULT 12)
RETURNS TABLE(
  week_start date,
  view_volume_kg numeric,
  recomputed_volume_kg numeric,
  diff numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
WITH weeks AS (
  SELECT generate_series(
           date_trunc('week', (now() AT TIME ZONE 'Europe/Tallinn'))::date - ((p_weeks - 1) * 7),
           date_trunc('week', (now() AT TIME ZONE 'Europe/Tallinn'))::date,
           INTERVAL '1 week'
         )::date AS week_start
),
view_data AS (
  SELECT week_start, COALESCE(weekly_volume_kg, 0) AS view_volume_kg
  FROM v_user_weekly_extended
  WHERE user_id = p_user_id
),
recomp AS (
  SELECT 
    date_trunc('week', ws.started_at AT TIME ZONE 'Europe/Tallinn')::date AS week_start,
    SUM(COALESCE(sl.weight_kg_done, 0) * COALESCE(sl.reps_done, 0)) AS recomputed_volume_kg
  FROM workout_sessions ws
  LEFT JOIN set_logs sl ON ws.id = sl.session_id
  WHERE ws.user_id = p_user_id
  GROUP BY 1
)
SELECT 
  w.week_start,
  COALESCE(v.view_volume_kg, 0) AS view_volume_kg,
  COALESCE(r.recomputed_volume_kg, 0) AS recomputed_volume_kg,
  COALESCE(v.view_volume_kg, 0) - COALESCE(r.recomputed_volume_kg, 0) AS diff
FROM weeks w
LEFT JOIN view_data v USING (week_start)
LEFT JOIN recomp r USING (week_start)
ORDER BY w.week_start DESC;
$$;

-- Compare weekly session counts between v_user_weekly_extended and workout_sessions
DROP FUNCTION IF EXISTS public.verify_weekly_sessions_parity(p_user_id uuid, p_weeks int);
CREATE OR REPLACE FUNCTION public.verify_weekly_sessions_parity(p_user_id uuid, p_weeks int DEFAULT 12)
RETURNS TABLE(
  week_start date,
  view_sessions integer,
  recomputed_sessions integer,
  diff integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
WITH weeks AS (
  SELECT generate_series(
           date_trunc('week', (now() AT TIME ZONE 'Europe/Tallinn'))::date - ((p_weeks - 1) * 7),
           date_trunc('week', (now() AT TIME ZONE 'Europe/Tallinn'))::date,
           INTERVAL '1 week'
         )::date AS week_start
),
view_data AS (
  SELECT week_start, COALESCE(sessions_count, 0) AS view_sessions
  FROM v_user_weekly_extended
  WHERE user_id = p_user_id
),
recomp AS (
  SELECT 
    date_trunc('week', ws.started_at AT TIME ZONE 'Europe/Tallinn')::date AS week_start,
    COUNT(*) FILTER (WHERE ws.ended_at IS NOT NULL) AS recomputed_sessions
  FROM workout_sessions ws
  WHERE ws.user_id = p_user_id
  GROUP BY 1
)
SELECT 
  w.week_start,
  COALESCE(v.view_sessions, 0) AS view_sessions,
  COALESCE(r.recomputed_sessions, 0) AS recomputed_sessions,
  (COALESCE(v.view_sessions, 0) - COALESCE(r.recomputed_sessions, 0)) AS diff
FROM weeks w
LEFT JOIN view_data v USING (week_start)
LEFT JOIN recomp r USING (week_start)
ORDER BY w.week_start DESC;
$$;

-- Compare weekly average RPE between view and recomputed from exercise_notes
DROP FUNCTION IF EXISTS public.verify_weekly_rpe_parity(p_user_id uuid, p_weeks int);
CREATE OR REPLACE FUNCTION public.verify_weekly_rpe_parity(p_user_id uuid, p_weeks int DEFAULT 12)
RETURNS TABLE(
  week_start date,
  view_avg_rpe numeric,
  recomputed_avg_rpe numeric,
  diff numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
WITH weeks AS (
  SELECT generate_series(
           date_trunc('week', (now() AT TIME ZONE 'Europe/Tallinn'))::date - ((p_weeks - 1) * 7),
           date_trunc('week', (now() AT TIME ZONE 'Europe/Tallinn'))::date,
           INTERVAL '1 week'
         )::date AS week_start
),
view_data AS (
  SELECT week_start, COALESCE(weekly_avg_rpe, 0) AS view_avg_rpe
  FROM v_user_weekly_extended
  WHERE user_id = p_user_id
),
recomp AS (
  SELECT 
    date_trunc('week', ws.started_at AT TIME ZONE 'Europe/Tallinn')::date AS week_start,
    AVG(en.rpe)::numeric AS recomputed_avg_rpe
  FROM exercise_notes en
  JOIN workout_sessions ws ON ws.id = en.session_id
  WHERE en.user_id = p_user_id AND en.rpe IS NOT NULL
    AND ws.started_at IS NOT NULL
  GROUP BY 1
)
SELECT 
  w.week_start,
  COALESCE(v.view_avg_rpe, 0) AS view_avg_rpe,
  COALESCE(r.recomputed_avg_rpe, 0) AS recomputed_avg_rpe,
  (COALESCE(v.view_avg_rpe, 0) - COALESCE(r.recomputed_avg_rpe, 0)) AS diff
FROM weeks w
LEFT JOIN view_data v USING (week_start)
LEFT JOIN recomp r USING (week_start)
ORDER BY w.week_start DESC;
$$;


