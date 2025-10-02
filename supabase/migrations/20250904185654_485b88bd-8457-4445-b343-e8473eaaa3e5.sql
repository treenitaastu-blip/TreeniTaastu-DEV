-- Enable Row Level Security on userprogress_backup table
ALTER TABLE public.userprogress_backup ENABLE ROW LEVEL SECURITY;

-- Add policy to allow users to view only their own progress data
CREATE POLICY "Users can view their own backup progress" 
ON public.userprogress_backup 
FOR SELECT 
USING (auth.uid() = user_id);

-- Add policy to allow users to insert their own progress data
CREATE POLICY "Users can insert their own backup progress" 
ON public.userprogress_backup 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add policy to allow users to update their own progress data
CREATE POLICY "Users can update their own backup progress" 
ON public.userprogress_backup 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add policy to allow users to delete their own progress data
CREATE POLICY "Users can delete their own backup progress" 
ON public.userprogress_backup 
FOR DELETE 
USING (auth.uid() = user_id);