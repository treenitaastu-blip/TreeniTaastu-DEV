-- Create userprogress table to track user completion
CREATE TABLE public.userprogress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  programday_id UUID NOT NULL REFERENCES public.programday(id),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, programday_id)
);

-- Enable Row Level Security
ALTER TABLE public.userprogress ENABLE ROW LEVEL SECURITY;

-- Create policies for user progress
CREATE POLICY "Users can view their own progress" 
ON public.userprogress 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own progress" 
ON public.userprogress 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" 
ON public.userprogress 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create subscribers table for Stripe integration
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT,
  subscription_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for subscribers
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Create policies for subscribers
CREATE POLICY "Users can view their own subscription" 
ON public.subscribers 
FOR SELECT 
USING (auth.uid() = user_id OR auth.email() = email);

CREATE POLICY "Users can update their own subscription" 
ON public.subscribers 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can insert subscription" 
ON public.subscribers 
FOR INSERT 
WITH CHECK (true);