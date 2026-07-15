-- Columns used by the in-workout exercise feedback flow.
-- The UI already writes these values, so keep the migration idempotent for
-- environments where the columns may have been created manually.
ALTER TABLE public.exercise_notes
  ADD COLUMN IF NOT EXISTS exercise_feedback text,
  ADD COLUMN IF NOT EXISTS progression_reason text;

ALTER TABLE public.exercise_notes
  DROP CONSTRAINT IF EXISTS exercise_notes_exercise_feedback_check;

ALTER TABLE public.exercise_notes
  ADD CONSTRAINT exercise_notes_exercise_feedback_check
  CHECK (
    exercise_feedback IS NULL
    OR exercise_feedback IN ('too_easy', 'just_right', 'too_hard')
  );
