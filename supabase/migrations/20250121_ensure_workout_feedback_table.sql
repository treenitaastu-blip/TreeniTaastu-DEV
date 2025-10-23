-- Ensure workout_feedback table exists with proper structure
CREATE TABLE IF NOT EXISTS public.workout_feedback (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  program_id uuid NOT NULL,
  energy text NOT NULL CHECK (energy IN ('low', 'normal', 'high')),
  soreness text NOT NULL CHECK (soreness IN ('none', 'mild', 'high')),
  pump text NOT NULL CHECK (pump IN ('poor', 'good', 'excellent')),
  joint_pain text NOT NULL CHECK (joint_pain IN ('yes', 'no')),
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

-- Enable RLS if not already enabled
ALTER TABLE public.workout_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workout_feedback' 
    AND policyname = 'Users can view their own workout feedback'
  ) THEN
    CREATE POLICY "Users can view their own workout feedback" ON public.workout_feedback
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workout_feedback' 
    AND policyname = 'Users can insert their own workout feedback'
  ) THEN
    CREATE POLICY "Users can insert their own workout feedback" ON public.workout_feedback
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_workout_feedback_user_id ON public.workout_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_feedback_session_id ON public.workout_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_workout_feedback_program_id ON public.workout_feedback(program_id);
CREATE INDEX IF NOT EXISTS idx_workout_feedback_created_at ON public.workout_feedback(created_at);

-- Grant permissions
GRANT ALL ON public.workout_feedback TO authenticated;

