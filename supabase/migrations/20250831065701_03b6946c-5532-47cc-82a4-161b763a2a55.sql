-- Create profiles table for user information
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone DEFAULT now()
);

-- Create subscribers table for trial/subscription management  
CREATE TABLE IF NOT EXISTS public.subscribers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'trialing',
  plan text DEFAULT 'basic',
  started_at timestamp with time zone DEFAULT now(),
  trial_ends_at timestamp with time zone,
  expires_at timestamp with time zone,
  paused boolean NOT NULL DEFAULT false,
  source text
);

-- Create payments table for payment history
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create exercises table for exercise content
CREATE TABLE IF NOT EXISTS public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE,
  title text NOT NULL,
  body_region text,
  level text,
  media_url text,
  duration_seconds integer,
  created_at timestamp with time zone DEFAULT now()
);

-- Create progress table for user progress tracking
CREATE TABLE IF NOT EXISTS public.progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  completed jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS subscribers_user_id_key ON public.subscribers(user_id);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS policies for subscribers
DROP POLICY IF EXISTS "subscribers_select_own" ON public.subscribers;
CREATE POLICY "subscribers_select_own" ON public.subscribers
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "subscribers_update_own" ON public.subscribers;
CREATE POLICY "subscribers_update_own" ON public.subscribers
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "subscribers_insert_own" ON public.subscribers;
CREATE POLICY "subscribers_insert_own" ON public.subscribers
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create RLS policies for payments
DROP POLICY IF EXISTS "payments_select_own" ON public.payments;
CREATE POLICY "payments_select_own" ON public.payments
  FOR SELECT USING (user_id = auth.uid());

-- Create RLS policies for exercises (public read)
DROP POLICY IF EXISTS "exercises_read_all" ON public.exercises;
CREATE POLICY "exercises_read_all" ON public.exercises
  FOR SELECT USING (true);

-- Create RLS policies for progress
DROP POLICY IF EXISTS "progress_select_own" ON public.progress;
CREATE POLICY "progress_select_own" ON public.progress
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "progress_insert_own" ON public.progress;
CREATE POLICY "progress_insert_own" ON public.progress
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "progress_update_own" ON public.progress;
CREATE POLICY "progress_update_own" ON public.progress
  FOR UPDATE USING (user_id = auth.uid());

-- Create function to ensure trial on signup
CREATE OR REPLACE FUNCTION public.ensure_trial_on_signup()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.subscribers(user_id, status, plan, started_at, trial_ends_at, source)
  VALUES (new.id, 'trialing', 'basic', now(), now() + interval '1 day', 'signup_trigger')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.profiles(id) VALUES (new.id)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$;

-- Create trigger for automatic trial setup
DROP TRIGGER IF EXISTS trg_ensure_trial_on_signup ON auth.users;
CREATE TRIGGER trg_ensure_trial_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.ensure_trial_on_signup();

-- Create function to check if user is subscriber
CREATE OR REPLACE FUNCTION public.is_subscriber(uid uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.subscribers s
    WHERE s.user_id = uid
      AND COALESCE(s.paused, false) = false
      AND (
        (s.status = 'trialing' AND COALESCE(s.trial_ends_at, now() - interval '1 hour') > now())
        OR
        (s.status = 'active' AND (s.expires_at IS NULL OR s.expires_at > now()))
      )
  );
$$;