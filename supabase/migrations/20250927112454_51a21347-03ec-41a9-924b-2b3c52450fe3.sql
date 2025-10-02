-- Create custom habits table for users
CREATE TABLE public.custom_habits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) <= 100),
    icon_name TEXT NOT NULL DEFAULT 'CheckCircle' CHECK (char_length(icon_name) <= 50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT unique_user_habit_title UNIQUE(user_id, title)
);

-- Enable RLS
ALTER TABLE public.custom_habits ENABLE ROW LEVEL SECURITY;

-- RLS policies for custom habits
CREATE POLICY "Users can manage their own custom habits"
ON public.custom_habits
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_custom_habits_updated_at
    BEFORE UPDATE ON public.custom_habits
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_custom_habits_user_id ON public.custom_habits(user_id);
CREATE INDEX idx_custom_habits_user_active ON public.custom_habits(user_id, is_active);

-- Insert some default habits for new users (these will be customizable)
-- We'll handle this in the application code when users first visit