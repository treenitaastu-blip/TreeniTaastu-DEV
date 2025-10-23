-- Add new feedback system columns to exercise_notes table
ALTER TABLE public.exercise_notes 
ADD COLUMN IF NOT EXISTS exercise_feedback text,
ADD COLUMN IF NOT EXISTS progression_reason text;

-- Create workout_feedback table for comprehensive workout feedback
CREATE TABLE IF NOT EXISTS public.workout_feedback (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  program_id uuid NOT NULL,
  energy text NOT NULL CHECK (energy IN ('low', 'normal', 'high')),
  soreness text NOT NULL CHECK (soreness IN ('none', 'mild', 'high')),
  pump text NOT NULL CHECK (pump IN ('poor', 'good', 'excellent')),
  joint_pain boolean NOT NULL,
  overall_difficulty text NOT NULL CHECK (overall_difficulty IN ('too_easy', 'just_right', 'too_hard')),
  notes text,
  volume_multiplier numeric NOT NULL DEFAULT 1.0,
  intensity_multiplier numeric NOT NULL DEFAULT 1.0,
  recommendations text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT workout_feedback_pkey PRIMARY KEY (id),
  CONSTRAINT workout_feedback_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  CONSTRAINT workout_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT workout_feedback_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.client_programs(id) ON DELETE CASCADE
);

-- Enable RLS on workout_feedback table
ALTER TABLE public.workout_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for workout_feedback
CREATE POLICY "Users can view their own workout feedback" ON public.workout_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workout feedback" ON public.workout_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout feedback" ON public.workout_feedback
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout feedback" ON public.workout_feedback
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_feedback_user_id ON public.workout_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_feedback_session_id ON public.workout_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_workout_feedback_program_id ON public.workout_feedback(program_id);
CREATE INDEX IF NOT EXISTS idx_workout_feedback_created_at ON public.workout_feedback(created_at);

-- Create function to get exercise progression based on feedback
CREATE OR REPLACE FUNCTION public.get_exercise_progression_from_feedback(
  p_client_item_id uuid,
  p_weeks_back integer DEFAULT 4
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_feedback_data RECORD;
  v_progression jsonb;
  v_too_easy_count integer := 0;
  v_just_right_count integer := 0;
  v_too_hard_count integer := 0;
  v_total_feedback integer := 0;
  v_current_weight numeric;
  v_suggested_weight numeric;
  v_reason text;
BEGIN
  -- Get current weight
  SELECT weight_kg INTO v_current_weight
  FROM client_items 
  WHERE id = p_client_item_id;
  
  -- Get feedback data from recent sessions
  SELECT 
    COUNT(*) FILTER (WHERE exercise_feedback = 'too_easy') as too_easy_count,
    COUNT(*) FILTER (WHERE exercise_feedback = 'just_right') as just_right_count,
    COUNT(*) FILTER (WHERE exercise_feedback = 'too_hard') as too_hard_count,
    COUNT(*) as total_feedback
  INTO v_feedback_data
  FROM exercise_notes en
  JOIN workout_sessions ws ON ws.id = en.session_id
  WHERE en.client_item_id = p_client_item_id
    AND en.exercise_feedback IS NOT NULL
    AND ws.started_at >= NOW() - (p_weeks_back || ' weeks')::INTERVAL;
  
  v_too_easy_count := v_feedback_data.too_easy_count;
  v_just_right_count := v_feedback_data.just_right_count;
  v_too_hard_count := v_feedback_data.too_hard_count;
  v_total_feedback := v_feedback_data.total_feedback;
  
  -- If no feedback data, return maintain
  IF v_total_feedback = 0 THEN
    RETURN jsonb_build_object(
      'action', 'maintain',
      'reason', 'no_feedback_data',
      'current_weight', v_current_weight,
      'suggested_weight', v_current_weight,
      'confidence', 0
    );
  END IF;
  
  -- Calculate progression based on feedback patterns
  v_suggested_weight := v_current_weight;
  v_reason := '';
  
  -- If mostly too easy, increase weight
  IF v_too_easy_count > v_just_right_count AND v_too_easy_count > v_too_hard_count THEN
    v_suggested_weight := v_current_weight * 1.025; -- 2.5% increase
    v_reason := 'Mostly too easy - increasing weight';
  -- If mostly too hard, decrease weight
  ELSIF v_too_hard_count > v_just_right_count AND v_too_hard_count > v_too_easy_count THEN
    v_suggested_weight := v_current_weight * 0.975; -- 2.5% decrease
    v_reason := 'Mostly too hard - decreasing weight';
  -- If mostly just right, maintain
  ELSE
    v_suggested_weight := v_current_weight;
    v_reason := 'Mostly just right - maintaining weight';
  END IF;
  
  -- Round to nearest 0.5kg
  v_suggested_weight := ROUND(v_suggested_weight * 2) / 2;
  
  -- Build progression result
  v_progression := jsonb_build_object(
    'action', CASE 
      WHEN v_suggested_weight > v_current_weight THEN 'increase'
      WHEN v_suggested_weight < v_current_weight THEN 'decrease'
      ELSE 'maintain'
    END,
    'reason', v_reason,
    'current_weight', v_current_weight,
    'suggested_weight', v_suggested_weight,
    'weight_change', v_suggested_weight - v_current_weight,
    'too_easy_count', v_too_easy_count,
    'just_right_count', v_just_right_count,
    'too_hard_count', v_too_hard_count,
    'total_feedback', v_total_feedback,
    'confidence', LEAST(v_total_feedback / 4.0, 1.0) -- Confidence based on data amount
  );
  
  RETURN v_progression;
END;
$$;

-- Create function to get workout progression recommendations
CREATE OR REPLACE FUNCTION public.get_workout_progression_recommendations(
  p_user_id uuid,
  p_weeks_back integer DEFAULT 4
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_feedback_data RECORD;
  v_recommendations jsonb;
  v_avg_energy text;
  v_avg_soreness text;
  v_avg_pump text;
  v_avg_difficulty text;
  v_volume_trend numeric;
  v_intensity_trend numeric;
BEGIN
  -- Get aggregated feedback data
  SELECT 
    MODE() WITHIN GROUP (ORDER BY energy) as avg_energy,
    MODE() WITHIN GROUP (ORDER BY soreness) as avg_soreness,
    MODE() WITHIN GROUP (ORDER BY pump) as avg_pump,
    MODE() WITHIN GROUP (ORDER BY overall_difficulty) as avg_difficulty,
    AVG(volume_multiplier) as avg_volume_multiplier,
    AVG(intensity_multiplier) as avg_intensity_multiplier,
    COUNT(*) as feedback_count
  INTO v_feedback_data
  FROM workout_feedback
  WHERE user_id = p_user_id
    AND created_at >= NOW() - (p_weeks_back || ' weeks')::INTERVAL;
  
  v_avg_energy := v_feedback_data.avg_energy;
  v_avg_soreness := v_feedback_data.avg_soreness;
  v_avg_pump := v_feedback_data.avg_pump;
  v_avg_difficulty := v_feedback_data.avg_difficulty;
  v_volume_trend := v_feedback_data.avg_volume_multiplier;
  v_intensity_trend := v_feedback_data.avg_intensity_multiplier;
  
  -- If no feedback data, return default recommendations
  IF v_feedback_data.feedback_count = 0 THEN
    RETURN jsonb_build_object(
      'recommendations', ARRAY['Start providing workout feedback for personalized recommendations'],
      'volume_trend', 1.0,
      'intensity_trend', 1.0,
      'confidence', 0
    );
  END IF;
  
  -- Build recommendations based on patterns
  v_recommendations := jsonb_build_array();
  
  -- Energy-based recommendations
  IF v_avg_energy = 'low' THEN
    v_recommendations := v_recommendations || jsonb_build_object(
      'type', 'energy',
      'message', 'Consider reducing training frequency or intensity',
      'priority', 'high'
    );
  ELSIF v_avg_energy = 'high' THEN
    v_recommendations := v_recommendations || jsonb_build_object(
      'type', 'energy',
      'message', 'You can handle more training volume',
      'priority', 'medium'
    );
  END IF;
  
  -- Soreness-based recommendations
  IF v_avg_soreness = 'high' THEN
    v_recommendations := v_recommendations || jsonb_build_object(
      'type', 'recovery',
      'message', 'Focus on recovery - reduce volume or add rest days',
      'priority', 'high'
    );
  ELSIF v_avg_soreness = 'none' AND v_avg_energy = 'normal' THEN
    v_recommendations := v_recommendations || jsonb_build_object(
      'type', 'progression',
      'message', 'Good recovery - you can progress training',
      'priority', 'medium'
    );
  END IF;
  
  -- Pump quality recommendations
  IF v_avg_pump = 'poor' THEN
    v_recommendations := v_recommendations || jsonb_build_object(
      'type', 'training',
      'message', 'Improve training intensity or form',
      'priority', 'medium'
    );
  ELSIF v_avg_pump = 'excellent' THEN
    v_recommendations := v_recommendations || jsonb_build_object(
      'type', 'training',
      'message', 'Excellent pump quality - maintain current approach',
      'priority', 'low'
    );
  END IF;
  
  -- Difficulty-based recommendations
  IF v_avg_difficulty = 'too_easy' THEN
    v_recommendations := v_recommendations || jsonb_build_object(
      'type', 'progression',
      'message', 'Increase training difficulty',
      'priority', 'high'
    );
  ELSIF v_avg_difficulty = 'too_hard' THEN
    v_recommendations := v_recommendations || jsonb_build_object(
      'type', 'recovery',
      'message', 'Reduce training difficulty',
      'priority', 'high'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'recommendations', v_recommendations,
    'volume_trend', v_volume_trend,
    'intensity_trend', v_intensity_trend,
    'avg_energy', v_avg_energy,
    'avg_soreness', v_avg_soreness,
    'avg_pump', v_avg_pump,
    'avg_difficulty', v_avg_difficulty,
    'feedback_count', v_feedback_data.feedback_count,
    'confidence', LEAST(v_feedback_data.feedback_count / 8.0, 1.0)
  );
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.workout_feedback TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_exercise_progression_from_feedback TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workout_progression_recommendations TO authenticated;

