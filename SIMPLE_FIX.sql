-- =====================================================
-- SIMPLE FIX - Apply this SQL in Supabase SQL Editor
-- This creates user_entitlements table without enum types
-- =====================================================

-- Create user_entitlements table with TEXT product column (simpler)
CREATE TABLE IF NOT EXISTS public.user_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product text NOT NULL CHECK (product IN ('static', 'pt')),
  status text NOT NULL CHECK (status IN ('active', 'trialing', 'expired', 'cancelled')),
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  trial_ends_at timestamp with time zone,
  expires_at timestamp with time zone,
  paused boolean NOT NULL DEFAULT false,
  source text,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, product)
);

-- Enable RLS
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "ue_select_self_or_admin" ON public.user_entitlements;
CREATE POLICY "ue_select_self_or_admin" 
ON public.user_entitlements 
FOR SELECT 
USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "ue_insert_service_role" ON public.user_entitlements;
CREATE POLICY "ue_insert_service_role" 
ON public.user_entitlements 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "ue_update_service_role" ON public.user_entitlements;
CREATE POLICY "ue_update_service_role" 
ON public.user_entitlements 
FOR UPDATE 
USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_entitlements_user_id ON public.user_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_user_status ON public.user_entitlements(user_id, status, expires_at);

-- Update signup trigger to use TEXT (not enum)
CREATE OR REPLACE FUNCTION public.ensure_trial_on_signup()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles(id, email, created_at, role, full_name) 
  VALUES (
    new.id, 
    new.email, 
    now(), 
    'user',
    COALESCE(new.raw_user_meta_data->>'full_name', NULL)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

  -- Grant 7-day trial (using TEXT, not enum)
  INSERT INTO public.user_entitlements(
    user_id, 
    product, 
    status, 
    started_at, 
    trial_ends_at, 
    paused, 
    source, 
    note
  )
  VALUES (
    new.id, 
    'static'::text,  -- Explicitly cast to text
    'trialing'::text,
    now(), 
    now() + interval '7 days', 
    false, 
    'signup_trigger', 
    '7-day trial'
  )
  ON CONFLICT (user_id, product) DO NOTHING;

  -- Maintain subscribers table
  INSERT INTO public.subscribers(user_id, status, plan, started_at, trial_ends_at, source)
  VALUES (new.id, 'trialing', 'basic', now(), now() + interval '7 days', 'signup_trigger')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN new;
END;
$$;

-- Verify the table was created
SELECT 'user_entitlements table created!' as message
WHERE EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'user_entitlements' AND table_schema = 'public'
);

