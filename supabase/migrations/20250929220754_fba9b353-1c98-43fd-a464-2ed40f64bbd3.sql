-- Drop the old unique constraint that prevents repeating program days
ALTER TABLE userprogress DROP CONSTRAINT IF EXISTS userprogress_user_id_programday_id_key;

-- Add new unique index: same programday can be done on different days, but only once per day (Tallinn timezone)
CREATE UNIQUE INDEX IF NOT EXISTS userprogress_user_programday_date_unique 
ON userprogress (user_id, programday_id, ((completed_at AT TIME ZONE 'Europe/Tallinn')::date));

-- Comment explaining the constraint
COMMENT ON INDEX userprogress_user_programday_date_unique IS 
'Allows users to repeat program days on different dates (for repeating cycles), but prevents duplicate completions on the same day (Tallinn timezone)';