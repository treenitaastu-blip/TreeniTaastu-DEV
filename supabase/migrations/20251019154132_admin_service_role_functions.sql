-- Create admin functions that work with service role key (no admin role checks needed)
-- These functions are designed to be called with the service role key

-- Admin set entitlement without role check (for service role)
CREATE OR REPLACE FUNCTION public.admin_set_entitlement_service(
    p_user uuid, 
    p_product text, 
    p_status text, 
    p_days integer DEFAULT NULL, 
    p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE 
    v_until timestamptz := CASE WHEN p_days IS NULL THEN NULL ELSE now() + (p_days || ' days')::interval END;
BEGIN
    -- No admin check needed - service role key is trusted
    INSERT INTO user_entitlements(user_id, product, status, started_at, trial_ends_at, expires_at, paused, source, note)
    VALUES (p_user, p_product::product_kind, p_status, now(),
            CASE WHEN p_status='trialing' THEN v_until ELSE NULL END,
            CASE WHEN p_status='active'   THEN v_until ELSE NULL END,
            false, 'manual', p_note)
    ON CONFLICT(user_id, product) DO UPDATE
        SET status=EXCLUDED.status,
            trial_ends_at=EXCLUDED.trial_ends_at,
            expires_at=EXCLUDED.expires_at,
            paused=false,
            note=COALESCE(EXCLUDED.note, user_entitlements.note),
            updated_at=now();
END $$;

-- Admin pause entitlement without role check (for service role)
CREATE OR REPLACE FUNCTION public.admin_pause_entitlement_service(
    p_user uuid, 
    p_product text, 
    p_pause boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- No admin check needed - service role key is trusted
    UPDATE user_entitlements
    SET paused = p_pause,
        updated_at = now()
    WHERE user_id = p_user
      AND product = p_product::product_kind;
END $$;

-- Admin clear entitlement without role check (for service role)
CREATE OR REPLACE FUNCTION public.admin_clear_entitlement_service(
    p_user uuid, 
    p_product text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- No admin check needed - service role key is trusted
    DELETE FROM user_entitlements 
    WHERE user_id = p_user 
      AND product = p_product::product_kind;
END $$;
