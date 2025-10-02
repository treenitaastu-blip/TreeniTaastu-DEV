-- Fix booking RLS policies to allow edge functions to create bookings

-- Add a policy for edge functions (service role) to create bookings
CREATE POLICY "Edge functions can create bookings" 
ON public.booking_requests 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Also ensure the confirm-booking edge function can update bookings
CREATE POLICY "Edge functions can update bookings" 
ON public.booking_requests 
FOR UPDATE 
TO service_role
USING (true)
WITH CHECK (true);

-- Create a function to validate booking data (for additional security)
CREATE OR REPLACE FUNCTION validate_booking_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure required fields are present
  IF NEW.user_id IS NULL OR NEW.client_name IS NULL OR NEW.client_email IS NULL THEN
    RAISE EXCEPTION 'Missing required booking fields';
  END IF;
  
  -- Validate email format
  IF NEW.client_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Validate service type
  IF NEW.service_type NOT IN ('initial_assessment', 'personal_program', 'monthly_support') THEN
    RAISE EXCEPTION 'Invalid service type';
  END IF;
  
  -- Set defaults
  NEW.status = COALESCE(NEW.status, 'pending');
  NEW.duration_minutes = COALESCE(NEW.duration_minutes, 60);
  
  RETURN NEW;
END;
$$;

-- Add trigger to validate booking data
DROP TRIGGER IF EXISTS validate_booking_trigger ON booking_requests;
CREATE TRIGGER validate_booking_trigger
  BEFORE INSERT OR UPDATE ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_insert();