-- Update workout_feedback table to support simplified questionnaire
-- Add new fields for joint pain location, fatigue level, and energy level

-- Add new columns to workout_feedback table
ALTER TABLE workout_feedback 
ADD COLUMN IF NOT EXISTS joint_pain_location TEXT,
ADD COLUMN IF NOT EXISTS fatigue_level INTEGER,
ADD COLUMN IF NOT EXISTS energy_level TEXT;

-- Create volume_progression table to track reps/sets progression per exercise per user
CREATE TABLE IF NOT EXISTS volume_progression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_item_id UUID NOT NULL REFERENCES client_items(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES client_programs(id) ON DELETE CASCADE,
  
  -- Current progression state
  current_reps INTEGER NOT NULL DEFAULT 8,
  target_reps INTEGER NOT NULL DEFAULT 12,
  current_sets INTEGER NOT NULL DEFAULT 2,
  target_sets INTEGER NOT NULL DEFAULT 4,
  
  -- Progression tracking
  progression_stage TEXT NOT NULL DEFAULT 'reps' CHECK (progression_stage IN ('reps', 'sets', 'maxed')),
  is_maxed BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one progression record per user per exercise
  UNIQUE(user_id, client_item_id)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_volume_progression_user_id ON volume_progression(user_id);
CREATE INDEX IF NOT EXISTS idx_volume_progression_client_item_id ON volume_progression(client_item_id);
CREATE INDEX IF NOT EXISTS idx_volume_progression_program_id ON volume_progression(program_id);
CREATE INDEX IF NOT EXISTS idx_volume_progression_stage ON volume_progression(progression_stage);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_volume_progression_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_volume_progression_updated_at
  BEFORE UPDATE ON volume_progression
  FOR EACH ROW
  EXECUTE FUNCTION update_volume_progression_updated_at();

-- Create function to initialize volume progression for new exercises
CREATE OR REPLACE FUNCTION initialize_volume_progression()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create progression for exercises with weight (not bodyweight)
  IF NEW.weight_kg > 0 THEN
    INSERT INTO volume_progression (
      user_id,
      client_item_id,
      program_id,
      current_reps,
      target_reps,
      current_sets,
      target_sets,
      progression_stage,
      is_maxed
    )
    SELECT 
      cp.assigned_to,
      NEW.id,
      NEW.program_id,
      8, -- Start with 8 reps
      12, -- Target 12 reps
      2, -- Start with 2 sets
      4, -- Target 4 sets
      'reps', -- Start with reps progression
      FALSE
    FROM client_programs cp
    WHERE cp.id = NEW.program_id
    ON CONFLICT (user_id, client_item_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to initialize volume progression when new exercises are added
CREATE TRIGGER trigger_initialize_volume_progression
  AFTER INSERT ON client_items
  FOR EACH ROW
  EXECUTE FUNCTION initialize_volume_progression();

-- Create function to apply volume progression based on workout feedback
CREATE OR REPLACE FUNCTION apply_volume_progression(
  p_user_id UUID,
  p_program_id UUID,
  p_fatigue_level INTEGER,
  p_energy_level TEXT,
  p_joint_pain BOOLEAN
)
RETURNS TABLE (
  exercise_name TEXT,
  old_reps INTEGER,
  new_reps INTEGER,
  old_sets INTEGER,
  new_sets INTEGER,
  progression_reason TEXT
) AS $$
DECLARE
  v_exercise RECORD;
  v_progression RECORD;
  v_reps_increase INTEGER;
  v_sets_increase INTEGER;
  v_reason TEXT;
BEGIN
  -- Determine progression adjustments based on feedback
  v_reps_increase := 0;
  v_sets_increase := 0;
  v_reason := '';
  
  -- High fatigue (8-10) → reduce volume
  IF p_fatigue_level >= 8 THEN
    v_reps_increase := -1;
    v_sets_increase := 0;
    v_reason := 'High fatigue - reducing volume';
  -- Low fatigue (0-3) and high energy → increase volume
  ELSIF p_fatigue_level <= 3 AND p_energy_level = 'high' THEN
    v_reps_increase := 1;
    v_sets_increase := 0;
    v_reason := 'Low fatigue, high energy - increasing volume';
  -- Joint pain → reduce intensity
  ELSIF p_joint_pain THEN
    v_reps_increase := -1;
    v_sets_increase := 0;
    v_reason := 'Joint pain - reducing intensity';
  -- Normal progression - no changes when feedback is normal
  ELSE
    v_reps_increase := 0;
    v_sets_increase := 0;
    v_reason := 'Normal progression - no changes needed';
  END IF;
  
  -- Apply progression to each exercise in the program
  FOR v_exercise IN (
    SELECT 
      ci.id as client_item_id,
      ci.exercise_name,
      ci.reps,
      ci.sets,
      vp.current_reps,
      vp.current_sets,
      vp.progression_stage,
      vp.is_maxed
    FROM client_items ci
    LEFT JOIN volume_progression vp ON vp.client_item_id = ci.id AND vp.user_id = p_user_id
    WHERE ci.program_id = p_program_id
    ORDER BY ci.order_in_day
  ) LOOP
    -- Skip if exercise is already maxed out
    IF v_exercise.is_maxed THEN
      CONTINUE;
    END IF;
    
    -- Calculate new values
    DECLARE
      v_new_reps INTEGER;
      v_new_sets INTEGER;
      v_new_stage TEXT;
      v_new_maxed BOOLEAN;
    BEGIN
      v_new_reps := GREATEST(8, LEAST(12, v_exercise.current_reps + v_reps_increase));
      v_new_sets := GREATEST(2, LEAST(4, v_exercise.current_sets + v_sets_increase));
      
      -- Determine progression stage
      IF v_new_reps >= 12 AND v_new_sets >= 4 THEN
        v_new_stage := 'maxed';
        v_new_maxed := TRUE;
      ELSIF v_new_reps >= 12 THEN
        v_new_stage := 'sets';
        v_new_maxed := FALSE;
      ELSE
        v_new_stage := 'reps';
        v_new_maxed := FALSE;
      END IF;
      
      -- Update or insert progression record
      INSERT INTO volume_progression (
        user_id,
        client_item_id,
        program_id,
        current_reps,
        target_reps,
        current_sets,
        target_sets,
        progression_stage,
        is_maxed
      )
      VALUES (
        p_user_id,
        v_exercise.client_item_id,
        p_program_id,
        v_new_reps,
        12,
        v_new_sets,
        4,
        v_new_stage,
        v_new_maxed
      )
      ON CONFLICT (user_id, client_item_id)
      DO UPDATE SET
        current_reps = v_new_reps,
        current_sets = v_new_sets,
        progression_stage = v_new_stage,
        is_maxed = v_new_maxed,
        updated_at = NOW();
      
      -- Update client_items table
      UPDATE client_items 
      SET 
        reps = v_new_reps,
        sets = v_new_sets
      WHERE id = v_exercise.client_item_id;
      
      -- Return progression info
      RETURN QUERY SELECT
        v_exercise.exercise_name,
        v_exercise.current_reps,
        v_new_reps,
        v_exercise.current_sets,
        v_new_sets,
        v_reason;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON volume_progression TO authenticated;
GRANT EXECUTE ON FUNCTION apply_volume_progression TO authenticated;
