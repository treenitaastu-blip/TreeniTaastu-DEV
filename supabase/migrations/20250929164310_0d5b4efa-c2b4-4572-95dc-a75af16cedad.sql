-- Create function to start 3-day PT trial for new users
CREATE OR REPLACE FUNCTION public.start_pt_trial_3d(u uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE 
  now_ts timestamptz := now();
  v_uid  uuid := COALESCE(u, auth.uid());
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'forbidden: missing user id (pass u or call with a valid auth.uid())';
  END IF;

  -- create row or extend only if no active PT entitlement/trial
  IF NOT EXISTS (
    SELECT 1 FROM user_entitlements
    WHERE user_id = v_uid AND product = 'pt'
      AND (
        (status = 'trialing' AND COALESCE(trial_ends_at, '-infinity') > now_ts) OR
        (status = 'active'   AND (expires_at IS NULL OR expires_at > now_ts))
      )
  ) THEN
    INSERT INTO user_entitlements (user_id, product, status, started_at, trial_ends_at, paused, source, note)
    VALUES (v_uid, 'pt', 'trialing', now_ts, now_ts + interval '3 days', false, 'manual', '3d PT trial')
    ON CONFLICT (user_id, product) DO UPDATE
      SET status='trialing', trial_ends_at=EXCLUDED.trial_ends_at, started_at=now_ts, paused=false, updated_at=now_ts;
  END IF;

  RETURN jsonb_build_object(
    'status','ok',
    'row', (SELECT to_jsonb(ue) FROM user_entitlements ue WHERE ue.user_id=v_uid AND ue.product='pt')
  );
END $$;