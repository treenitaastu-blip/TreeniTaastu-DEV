-- Create table for Tervisetõed articles
CREATE TABLE public.articles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text NOT NULL,
  category text NOT NULL,
  format text NOT NULL CHECK (format IN ('TLDR', 'Steps', 'MythFact')),
  read_time_minutes integer NOT NULL DEFAULT 1,
  evidence_strength text NOT NULL DEFAULT 'kõrge' CHECK (evidence_strength IN ('kõrge', 'keskmine', 'madal')),
  tldr jsonb NOT NULL DEFAULT '[]'::jsonb,
  body jsonb NOT NULL DEFAULT '[]'::jsonb,
  article_references jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_posts jsonb NOT NULL DEFAULT '[]'::jsonb,
  published boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Articles are viewable by everyone if published" 
ON public.articles 
FOR SELECT 
USING (published = true);

CREATE POLICY "Admins can view all articles" 
ON public.articles 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Only admins can insert articles" 
ON public.articles 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update articles" 
ON public.articles 
FOR UPDATE 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Only admins can delete articles" 
ON public.articles 
FOR DELETE 
USING (is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_articles_updated_at
BEFORE UPDATE ON public.articles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();