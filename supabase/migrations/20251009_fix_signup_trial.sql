-- Fix signup trigger to grant trial access in user_entitlements
-- This ensures new users get a 7-day trial with static access

CREATE OR REPLACE FUNCTION public.ensure_trial_on_signup()
RETURNS trigger LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles with email from auth.users
  INSERT INTO public.profiles(id, email, created_at, role) 
  VALUES (new.id, new.email, now(), 'user')
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    created_at = COALESCE(profiles.created_at, EXCLUDED.created_at);

  -- Insert into subscribers (legacy support)
  INSERT INTO public.subscribers(user_id, status, plan, started_at, trial_ends_at, source)
  VALUES (new.id, 'trialing', 'basic', now(), now() + interval '7 days', 'signup_trigger')
  ON CONFLICT (user_id) DO NOTHING;

  -- CRITICAL: Grant 7-day trial access in user_entitlements
  INSERT INTO public.user_entitlements(user_id, product, status, started_at, trial_ends_at, paused, source, note)
  VALUES (
    new.id, 
    'static', 
    'trialing', 
    now(), 
    now() + interval '7 days',
    false,
    'signup_trial',
    '7-day trial access on signup'
  )
  ON CONFLICT (user_id, product) DO UPDATE SET
    status = 'trialing',
    trial_ends_at = now() + interval '7 days',
    started_at = now(),
    paused = false,
    updated_at = now();
  
  RETURN new;
END;
$$;

-- Recreate trigger to use updated function
DROP TRIGGER IF EXISTS trg_ensure_trial_on_signup ON auth.users;
CREATE TRIGGER trg_ensure_trial_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.ensure_trial_on_signup();

