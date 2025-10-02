-- Create exercises table
CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  duration TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Algaja', 'Keskmine', 'Edasijõudnud')),
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Create policies for exercises
CREATE POLICY "Exercises are viewable by everyone" 
ON public.exercises 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can insert exercises" 
ON public.exercises 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update exercises" 
ON public.exercises 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Only admins can delete exercises" 
ON public.exercises 
FOR DELETE 
USING (is_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_exercises_updated_at
BEFORE UPDATE ON public.exercises
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the existing mock data
INSERT INTO public.exercises (title, description, category, duration, difficulty, video_url) VALUES
('Kaela külgvenitus', 'Leevendab kaela pingeid ja parandab liikuvust', 'neck', '2 min', 'Algaja', 'https://example.com/video1'),
('Õlgade rullimised', 'Lõdvestab õlalihaseid ja parandab rühti', 'shoulders', '3 min', 'Algaja', 'https://example.com/video2'),
('Selgroo keerdamine', 'Mobiliseerib selgroogu ja leevendab pingeid', 'back', '4 min', 'Keskmine', 'https://example.com/video3'),
('Puusa venitus istudes', 'Avab puusaliigese ja venitas puusafleksoreid', 'hips', '3 min', 'Algaja', 'https://example.com/video4'),
('Sügav kõhuhingamine', 'Rahustab närvisüsteemi ja vähendab stressi', 'breathing', '5 min', 'Algaja', 'https://example.com/video5'),
('Õlavöötme tugevdamine', 'Tugevdab õlavöötme lihaseid stabiilsuse parandamiseks', 'shoulders', '6 min', 'Keskmine', 'https://example.com/video6');