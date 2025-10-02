-- Step 1: Add new columns to programday table for the canonical structure
ALTER TABLE public.programday 
ADD COLUMN IF NOT EXISTS program_id UUID,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS exercises JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Step 2: Migrate existing programday data to exercises JSON array
UPDATE public.programday SET exercises = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'order', exercise_order,
      'name', exercise_name,
      'video_url', video_url,
      'sets', exercise_sets,
      'reps', exercise_reps,
      'seconds', exercise_seconds,
      'cues', exercise_cues
    )
  )
  FROM (
    SELECT 
      1 as exercise_order, exercise1 as exercise_name, videolink1 as video_url, 
      exercise1_sets as exercise_sets, exercise1_reps as exercise_reps,
      CASE 
        WHEN exercise1 ILIKE ANY(ARRAY['%hold%', '%plank%', '%stretch%', '%mobility%', '%rotation%', '%foam roll%']) THEN 30
        ELSE NULL 
      END as exercise_seconds,
      exercise1_hint as exercise_cues
    WHERE exercise1 IS NOT NULL AND exercise1 != ''
    UNION ALL
    SELECT 
      2, exercise2, videolink2, 
      exercise2_sets, exercise2_reps,
      CASE 
        WHEN exercise2 ILIKE ANY(ARRAY['%hold%', '%plank%', '%stretch%', '%mobility%', '%rotation%', '%foam roll%']) THEN 30
        ELSE NULL 
      END,
      exercise2_hint
    WHERE exercise2 IS NOT NULL AND exercise2 != ''
    UNION ALL
    SELECT 
      3, exercise3, videolink3, 
      exercise3_sets, exercise3_reps,
      CASE 
        WHEN exercise3 ILIKE ANY(ARRAY['%hold%', '%plank%', '%stretch%', '%mobility%', '%rotation%', '%foam roll%']) THEN 30
        ELSE NULL 
      END,
      exercise3_hint
    WHERE exercise3 IS NOT NULL AND exercise3 != ''
    UNION ALL
    SELECT 
      4, exercise4, videolink4, 
      exercise4_sets, exercise4_reps,
      CASE 
        WHEN exercise4 ILIKE ANY(ARRAY['%hold%', '%plank%', '%stretch%', '%mobility%', '%rotation%', '%foam roll%']) THEN 30
        ELSE NULL 
      END,
      exercise4_hint
    WHERE exercise4 IS NOT NULL AND exercise4 != ''
    UNION ALL
    SELECT 
      5, exercise5, videolink5, 
      exercise5_sets, exercise5_reps,
      CASE 
        WHEN exercise5 ILIKE ANY(ARRAY['%hold%', '%plank%', '%stretch%', '%mobility%', '%rotation%', '%foam roll%']) THEN 30
        ELSE NULL 
      END,
      exercise5_hint
    WHERE exercise5 IS NOT NULL AND exercise5 != ''
    ORDER BY exercise_order
  ) exercises_data
)
WHERE exercises = '[]'::jsonb;

-- Step 3: Apply exercise defaults for missing sets/reps based on exercise type
UPDATE public.programday SET exercises = (
  SELECT jsonb_agg(
    CASE 
      WHEN (exercise->>'sets')::int IS NULL OR (exercise->>'reps')::int IS NULL THEN
        exercise || jsonb_build_object(
          'sets', CASE 
            WHEN exercise->>'name' ILIKE ANY(ARRAY['%hold%', '%plank%', '%stretch%', '%mobility%', '%rotation%', '%foam roll%']) THEN 2
            WHEN exercise->>'name' ILIKE ANY(ARRAY['%press%', '%row%', '%squat%', '%deadlift%', '%lunge%', '%hinge%', '%pull%', '%push-up%', '%raise%', '%fly%', '%curl%', '%extension%']) THEN 3
            ELSE 2
          END,
          'reps', CASE 
            WHEN exercise->>'name' ILIKE ANY(ARRAY['%hold%', '%plank%', '%stretch%', '%mobility%', '%rotation%', '%foam roll%']) THEN NULL
            WHEN exercise->>'name' ILIKE ANY(ARRAY['%press%', '%row%', '%squat%', '%deadlift%', '%lunge%', '%hinge%', '%pull%', '%push-up%', '%raise%', '%fly%', '%curl%', '%extension%']) THEN 10
            ELSE 10
          END
        )
      ELSE exercise
    END ORDER BY (exercise->>'order')::int
  )
  FROM jsonb_array_elements(exercises) exercise
);

-- Step 4: Migrate data from programday_staging if it exists
INSERT INTO public.programday (week, day, program_id, title, notes, exercises, created_at, updated_at)
SELECT 
  week, 
  day,
  NULL as program_id,
  NULL as title, 
  hintprogramday_staging as notes,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'order', exercise_order,
        'name', exercise_name,
        'video_url', video_url,
        'sets', COALESCE(exercise_sets, CASE 
          WHEN exercise_name ILIKE ANY(ARRAY['%hold%', '%plank%', '%stretch%', '%mobility%', '%rotation%', '%foam roll%']) THEN 2
          WHEN exercise_name ILIKE ANY(ARRAY['%press%', '%row%', '%squat%', '%deadlift%', '%lunge%', '%hinge%', '%pull%', '%push-up%', '%raise%', '%fly%', '%curl%', '%extension%']) THEN 3
          ELSE 2
        END),
        'reps', COALESCE(exercise_reps, CASE 
          WHEN exercise_name ILIKE ANY(ARRAY['%hold%', '%plank%', '%stretch%', '%mobility%', '%rotation%', '%foam roll%']) THEN NULL
          ELSE 10
        END),
        'seconds', CASE 
          WHEN exercise_name ILIKE ANY(ARRAY['%hold%', '%plank%', '%stretch%', '%mobility%', '%rotation%', '%foam roll%']) THEN 30
          ELSE NULL 
        END,
        'cues', exercise_cues
      )
    )
    FROM (
      SELECT 1 as exercise_order, exercise1 as exercise_name, videolink1 as video_url, exercise1_sets as exercise_sets, exercise1_reps as exercise_reps, exercise1_hint as exercise_cues
      WHERE exercise1 IS NOT NULL AND exercise1 != ''
      UNION ALL
      SELECT 2, exercise2, videolink2, exercise2_sets, exercise2_reps, exercise2_hint
      WHERE exercise2 IS NOT NULL AND exercise2 != ''
      UNION ALL
      SELECT 3, exercise3, videolink3, exercise3_sets, exercise3_reps, exercise3_hint
      WHERE exercise3 IS NOT NULL AND exercise3 != ''
      UNION ALL
      SELECT 4, exercise4, videolink4, exercise4_sets, exercise4_reps, exercise4_hint
      WHERE exercise4 IS NOT NULL AND exercise4 != ''
      UNION ALL
      SELECT 5, exercise5, videolink5, exercise5_sets, exercise5_reps, exercise5_hint
      WHERE exercise5 IS NOT NULL AND exercise5 != ''
      ORDER BY exercise_order
    ) exercises_data
  ) as exercises,
  COALESCE(created_at, now()) as created_at,
  now() as updated_at
FROM public.programday_staging
WHERE NOT EXISTS (
  SELECT 1 FROM public.programday pd 
  WHERE pd.week = programday_staging.week AND pd.day = programday_staging.day
);

-- Step 5: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_programday_week_day ON public.programday (week, day);
CREATE INDEX IF NOT EXISTS idx_programday_program_id ON public.programday (program_id) WHERE program_id IS NOT NULL;

-- Step 6: Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_programday_updated_at
    BEFORE UPDATE ON public.programday
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Drop programday_staging table as it's no longer needed
DROP TABLE IF EXISTS public.programday_staging;