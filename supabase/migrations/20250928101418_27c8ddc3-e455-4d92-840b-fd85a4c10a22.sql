-- Create booking_requests table for Google Calendar integration
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
CREATE TYPE service_type AS ENUM ('initial_assessment', 'personal_program', 'monthly_support');

CREATE TABLE public.booking_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    service_type service_type NOT NULL,
    preferred_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    status booking_status NOT NULL DEFAULT 'pending',
    google_event_id TEXT,
    stripe_payment_intent_id TEXT,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_phone TEXT,
    pre_meeting_info JSONB DEFAULT '{}',
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own bookings" 
ON public.booking_requests 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own bookings" 
ON public.booking_requests 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own bookings" 
ON public.booking_requests 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all bookings" 
ON public.booking_requests 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Admins can update all bookings" 
ON public.booking_requests 
FOR UPDATE 
USING (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_booking_requests_updated_at
    BEFORE UPDATE ON public.booking_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();