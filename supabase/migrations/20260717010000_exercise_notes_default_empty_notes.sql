-- exercise_notes.notes is NOT NULL. Upserts that omit notes (RPE-only)
-- or send null were aborting workout finish.
UPDATE public.exercise_notes
SET notes = ''
WHERE notes IS NULL;

ALTER TABLE public.exercise_notes
  ALTER COLUMN notes SET DEFAULT '';
