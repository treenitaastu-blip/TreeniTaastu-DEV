-- Fix the admin functions to properly cast text to product_kind enum

-- Drop the conflicting functions first
DROP FUNCTION IF EXISTS public.admin_set_entitlement(uuid, product_kind, text, integer, text);
DROP FUNCTION IF EXISTS public.admin_pause_entitlement(uuid, product_kind, boolean);
DROP FUNCTION IF EXISTS public.admin_clear_entitlement(uuid, product_kind);

-- Recreate admin_set_entitlement with proper text handling
CREATE OR REPLACE FUNCTION public.admin_set_entitlement(
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
    IF NOT is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;

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

-- Recreate admin_pause_entitlement with proper text handling
CREATE OR REPLACE FUNCTION public.admin_pause_entitlement(
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
    IF NOT is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
    
    UPDATE user_entitlements
    SET paused = p_pause,
        updated_at = now()
    WHERE user_id = p_user
      AND product = p_product::product_kind;
END $$;

-- Recreate admin_clear_entitlement with proper text handling  
CREATE OR REPLACE FUNCTION public.admin_clear_entitlement(
    p_user uuid, 
    p_product text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    IF NOT is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
    
    DELETE FROM user_entitlements 
    WHERE user_id = p_user 
      AND product = p_product::product_kind;
END $$;