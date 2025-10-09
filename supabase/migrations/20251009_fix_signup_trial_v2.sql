-- Fix signup trigger to grant trial access - SAFE VERSION
-- This keeps the original trigger logic and just adds user_entitlements

CREATE OR REPLACE FUNCTION public.ensure_trial_on_signup()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Original logic: Insert into subscribers
  INSERT INTO public.subscribers(user_id, status, plan, started_at, trial_ends_at, source)
  VALUES (new.id, 'trialing', 'basic', now(), now() + interval '7 days', 'signup_trigger')
  ON CONFLICT (user_id) DO NOTHING;

  -- Original logic: Insert into profiles (just id)
  INSERT INTO public.profiles(id) VALUES (new.id)
  ON CONFLICT (id) DO NOTHING;

  -- NEW: Grant 7-day trial access in user_entitlements
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
  ON CONFLICT (user_id, product) DO NOTHING;
  
  RETURN new;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trg_ensure_trial_on_signup ON auth.users;
CREATE TRIGGER trg_ensure_trial_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.ensure_trial_on_signup();

