-- Create training journal table for clients to log their thoughts and experiences
CREATE TABLE public.training_journal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  client_program_id UUID REFERENCES public.client_programs(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  mood INTEGER CHECK (mood >= 1 AND mood <= 5), -- 1=very bad, 5=excellent
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
  motivation INTEGER CHECK (motivation >= 1 AND motivation <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on training journal
ALTER TABLE public.training_journal ENABLE ROW LEVEL SECURITY;

-- Policies for training journal
CREATE POLICY "Users can view their own journal entries" 
ON public.training_journal 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own journal entries" 
ON public.training_journal 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own journal entries" 
ON public.training_journal 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own journal entries" 
ON public.training_journal 
FOR DELETE 
USING (user_id = auth.uid());

-- Admins can view all journal entries for client management
CREATE POLICY "Admins can view all journal entries" 
ON public.training_journal 
FOR SELECT 
USING (is_admin());

-- Add updated_at trigger
CREATE TRIGGER update_training_journal_updated_at
BEFORE UPDATE ON public.training_journal
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();