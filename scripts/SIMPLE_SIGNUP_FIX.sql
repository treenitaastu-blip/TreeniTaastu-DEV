-- ========================================
-- SIMPLE SIGNUP FIX (No Verification)
-- ========================================
-- Just the fixes, no fancy checks
-- ========================================

-- Fix 1: Signup trigger
CREATE OR REPLACE FUNCTION public.ensure_trial_on_signup()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles(id, email, created_at, role, full_name) 
  VALUES (new.id, new.email, now(), 'user', COALESCE(new.raw_user_meta_data->>'full_name', NULL))
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

  INSERT INTO public.user_entitlements(user_id, product, status, started_at, trial_ends_at, paused, source, note)
  VALUES (new.id, 'static'::product_kind, 'trialing', now(), now() + interval '7 days', false, 'signup_trigger', '7-day free trial')
  ON CONFLICT (user_id, product) DO NOTHING;

  INSERT INTO public.subscribers(user_id, email, status, plan, started_at, trial_ends_at, source)
  VALUES (new.id, new.email, 'trialing', 'basic', now(), now() + interval '7 days', 'signup_trigger')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN new;
END;
$$;

-- Fix 2: Realtime filtering
ALTER TABLE public.support_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;
ALTER TABLE public.user_entitlements REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Done!
SELECT '✅ Signup fixes applied successfully!' as status;

