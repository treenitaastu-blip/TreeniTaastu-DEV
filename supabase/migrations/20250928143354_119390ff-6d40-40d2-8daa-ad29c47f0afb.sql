-- Add RIR (Reps in Reserve) field to exercise_notes table
ALTER TABLE exercise_notes ADD COLUMN rir_done smallint;

-- Add comment to explain the field
COMMENT ON COLUMN exercise_notes.rir_done IS 'Reps in Reserve - how many more reps the user could have done (0-5+)';