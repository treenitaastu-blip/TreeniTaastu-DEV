-- New accounts receive one seven-day trial for both product areas.
-- Access remains split into two entitlements so the existing guards keep
-- enforcing static and PT access independently after the trial ends.

CREATE OR REPLACE FUNCTION public.ensure_trial_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_started_at timestamptz := now();
  v_trial_ends_at timestamptz := v_started_at + interval '7 days';
BEGIN
  INSERT INTO public.profiles(id, email, created_at, role, full_name)
  VALUES (
    new.id,
    new.email,
    v_started_at,
    'user',
    NULLIF(new.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

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
  VALUES
    (
      new.id,
      'static'::public.product_kind,
      'trialing',
      v_started_at,
      v_trial_ends_at,
      false,
      'signup_trigger',
      '7-day full trial - static access'
    ),
    (
      new.id,
      'pt'::public.product_kind,
      'trialing',
      v_started_at,
      v_trial_ends_at,
      false,
      'signup_trigger',
      '7-day full trial - PT access'
    )
  ON CONFLICT (user_id, product) DO NOTHING;

  INSERT INTO public.subscribers(
    user_id,
    email,
    status,
    plan,
    started_at,
    trial_ends_at,
    source
  )
  VALUES (
    new.id,
    new.email,
    'trialing',
    'basic',
    v_started_at,
    v_trial_ends_at,
    'signup_trigger'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$;

COMMENT ON FUNCTION public.ensure_trial_on_signup() IS
'Creates a profile and grants new users one seven-day trial for both static and PT training plans.';

-- Give already-active signup trials the same PT access for their remaining
-- trial time without extending the original seven-day period.
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
SELECT
  static_trial.user_id,
  'pt'::public.product_kind,
  'trialing',
  static_trial.started_at,
  static_trial.trial_ends_at,
  false,
  'signup_trigger',
  '7-day full trial - PT access (backfilled)'
FROM public.user_entitlements AS static_trial
WHERE static_trial.product = 'static'::public.product_kind
  AND static_trial.status = 'trialing'
  AND static_trial.paused = false
  AND static_trial.source = 'signup_trigger'
  AND static_trial.trial_ends_at > now()
ON CONFLICT (user_id, product) DO NOTHING;
