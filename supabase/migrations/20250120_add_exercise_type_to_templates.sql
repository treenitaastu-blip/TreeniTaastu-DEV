-- Add exercise_type column to template_items table for exercise-specific progression
ALTER TABLE public.template_items 
ADD COLUMN exercise_type TEXT 
CHECK (exercise_type = ANY (ARRAY['compound'::text, 'isolation'::text, 'bodyweight'::text]))
DEFAULT 'isolation';

-- Add comment to explain the column
COMMENT ON COLUMN public.template_items.exercise_type IS 'Exercise type for progression logic: compound (2.5kg increments), isolation (1.25kg increments), bodyweight (rep progression)';

-- Add exercise_type column to client_items table as well (for existing programs)
ALTER TABLE public.client_items 
ADD COLUMN exercise_type TEXT 
CHECK (exercise_type = ANY (ARRAY['compound'::text, 'isolation'::text, 'bodyweight'::text]))
DEFAULT 'isolation';

-- Add comment to explain the column
COMMENT ON COLUMN public.client_items.exercise_type IS 'Exercise type for progression logic: compound (2.5kg increments), isolation (1.25kg increments), bodyweight (rep progression)';
