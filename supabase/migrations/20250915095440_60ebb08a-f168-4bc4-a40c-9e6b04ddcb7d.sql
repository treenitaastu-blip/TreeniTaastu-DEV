-- Ensure the test user henrikraavi1234@gmail.com has an active subscription
-- First, let's make sure we have the user ID
DO $$
DECLARE
    v_user_id uuid;
    v_email text := 'henrikraavi1234@gmail.com';
BEGIN
    -- Get user ID from auth.users
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE email = v_email 
    LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        -- Upsert subscriber row with active status
        INSERT INTO public.subscribers (
            user_id, 
            email, 
            status, 
            plan, 
            subscribed, 
            paused,
            started_at,
            trial_ends_at,
            expires_at,
            updated_at
        ) 
        VALUES (
            v_user_id,
            v_email,
            'active',
            'premium',
            true,
            false,
            now(),
            now() + interval '30 days', -- Extended trial
            now() + interval '1 year',  -- Active until next year
            now()
        )
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            status = 'active',
            plan = 'premium',
            subscribed = true,
            paused = false,
            trial_ends_at = now() + interval '30 days',
            expires_at = now() + interval '1 year',
            updated_at = now();
            
        RAISE NOTICE 'Updated subscription for user: % (ID: %)', v_email, v_user_id;
    ELSE
        RAISE NOTICE 'User not found: %', v_email;
    END IF;
END $$;