-- =====================================================
-- CRITICAL FIX - APPLY THIS SQL NOW
-- This fixes the "Database error saving new user" issue
-- =====================================================

BEGIN;

-- STEP 1: Add missing columns to profiles table
-- =====================================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user',
ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS current_period_end timestamp with time zone,
ADD COLUMN IF NOT EXISTS trial_used boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone;

-- Create index on email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role) WHERE role IS NOT NULL;


-- STEP 2: Create user_entitlements table (if not exists)
-- =====================================================

-- Create the product_kind enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_kind') THEN
        CREATE TYPE public.product_kind AS ENUM ('static', 'pt');
    END IF;
END$$;

-- Create the user_entitlements table
CREATE TABLE IF NOT EXISTS public.user_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product product_kind NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_user_entitlements_product_active ON public.user_entitlements(product, status) WHERE status IN ('active', 'trialing');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_user_entitlements_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_user_entitlements_updated_at ON public.user_entitlements;
CREATE TRIGGER update_user_entitlements_updated_at
BEFORE UPDATE ON public.user_entitlements
FOR EACH ROW
EXECUTE FUNCTION update_user_entitlements_updated_at();


-- STEP 3: Fix signup trigger
-- =====================================================

CREATE OR REPLACE FUNCTION public.ensure_trial_on_signup()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Create profile with email and default role
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

  -- Grant 7-day free trial for static program
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
    'static', 
    'trialing', 
    now(), 
    now() + interval '7 days', 
    false, 
    'signup_trigger', 
    '7-day free trial - auto-granted on signup'
  )
  ON CONFLICT (user_id, product) DO NOTHING;

  -- Also maintain legacy subscribers table for backward compatibility
  INSERT INTO public.subscribers(
    user_id, 
    status, 
    plan, 
    started_at, 
    trial_ends_at, 
    source
  )
  VALUES (
    new.id, 
    'trialing', 
    'basic', 
    now(), 
    now() + interval '7 days', 
    'signup_trigger'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN new;
END;
$$;

COMMIT;

-- =====================================================
-- VERIFICATION - Run this after the above
-- =====================================================

-- Check profiles table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check user_entitlements table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_entitlements'
) as entitlements_table_exists;

-- Check trigger function
SELECT EXISTS (
  SELECT FROM pg_proc 
  WHERE proname = 'ensure_trial_on_signup'
) as trigger_function_exists;

-- If all above return TRUE, you're good!
SELECT '✅ All fixes applied successfully! Try signing up again.' as status;



