-- Create analytics events table for detailed user tracking
CREATE TABLE IF NOT EXISTS public.user_analytics_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    event_type text NOT NULL,
    event_data jsonb DEFAULT '{}',
    page_url text,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now(),
    session_id text
);

-- Enable RLS
ALTER TABLE public.user_analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for analytics events
CREATE POLICY "users_can_insert_own_events" ON public.user_analytics_events
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_can_view_own_events" ON public.user_analytics_events
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "admins_can_view_all_events" ON public.user_analytics_events
    FOR SELECT USING (is_admin());

-- Index for performance
CREATE INDEX idx_user_analytics_events_user_id ON public.user_analytics_events(user_id);
CREATE INDEX idx_user_analytics_events_type ON public.user_analytics_events(event_type);
CREATE INDEX idx_user_analytics_events_created_at ON public.user_analytics_events(created_at);

-- Function to easily track events
CREATE OR REPLACE FUNCTION public.track_user_event(
    p_event_type text,
    p_event_data jsonb DEFAULT '{}',
    p_page_url text DEFAULT NULL,
    p_session_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_event_id uuid;
BEGIN
    -- Insert the event
    INSERT INTO public.user_analytics_events (
        user_id, 
        event_type, 
        event_data, 
        page_url, 
        session_id
    )
    VALUES (
        auth.uid(), 
        p_event_type, 
        p_event_data, 
        p_page_url, 
        p_session_id
    )
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END $$;