-- Add duration_weeks column to client_programs if it doesn't exist
ALTER TABLE client_programs 
ADD COLUMN IF NOT EXISTS duration_weeks INTEGER DEFAULT 4;

-- Add training_days_per_week column to track selected training days
ALTER TABLE client_programs 
ADD COLUMN IF NOT EXISTS training_days_per_week INTEGER DEFAULT 3 CHECK (training_days_per_week >= 1 AND training_days_per_week <= 5);

-- Add auto_progression_enabled column if it doesn't exist
ALTER TABLE client_programs 
ADD COLUMN IF NOT EXISTS auto_progression_enabled BOOLEAN DEFAULT true;

-- Add progression_parameters column if it doesn't exist  
ALTER TABLE client_programs 
ADD COLUMN IF NOT EXISTS progression_parameters JSONB DEFAULT '{"rep_increment": 1, "rpe_target_max": 8, "rpe_target_min": 6, "consistency_threshold": 3, "weight_increment_percentage": 5}'::jsonb;

-- Add status column if it doesn't exist
ALTER TABLE client_programs 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused'));

-- Add completed_at column if it doesn't exist
ALTER TABLE client_programs 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Update the v_program_progress view to include the new fields
CREATE OR REPLACE VIEW v_program_progress AS
SELECT 
  cp.id as program_id,
  cp.assigned_to as user_id,
  cp.start_date,
  cp.duration_weeks,
  cp.status,
  cp.completed_at,
  cp.auto_progression_enabled,
  CASE 
    WHEN cp.start_date IS NULL THEN 0
    ELSE FLOOR(EXTRACT(EPOCH FROM (NOW() - cp.start_date)) / (7 * 24 * 3600))
  END as weeks_elapsed,
  CASE 
    WHEN cp.duration_weeks IS NULL OR cp.duration_weeks = 0 THEN 0
    WHEN cp.start_date IS NULL THEN 0
    ELSE LEAST(100, FLOOR(100.0 * EXTRACT(EPOCH FROM (NOW() - cp.start_date)) / (cp.duration_weeks * 7 * 24 * 3600)))
  END as progress_percentage,
  CASE 
    WHEN cp.start_date IS NOT NULL 
         AND cp.duration_weeks IS NOT NULL 
         AND cp.duration_weeks > 0
         AND EXTRACT(EPOCH FROM (NOW() - cp.start_date)) >= (cp.duration_weeks * 7 * 24 * 3600)
         AND cp.status = 'active'
    THEN true
    ELSE false
  END as is_due_for_completion
FROM client_programs cp
WHERE cp.status != 'completed';