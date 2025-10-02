-- Drop the outdated RLS policy on programday table
DROP POLICY IF EXISTS "select_program_if_subscribed" ON public.programday;

-- Create new RLS policy using the modern access control function
CREATE POLICY "programday_select_static_access" 
ON public.programday 
FOR SELECT 
USING (can_access_static(auth.uid()));