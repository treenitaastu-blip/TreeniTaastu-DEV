-- Backfill missing total_sets and total_reps data in userprogress
-- Update total_sets and total_reps from sets and reps columns where they are 0
UPDATE userprogress 
SET 
  total_sets = COALESCE(sets, 0),
  total_reps = COALESCE(reps, 0)
WHERE 
  done = true 
  AND (total_sets = 0 OR total_reps = 0)
  AND (sets > 0 OR reps > 0);