-- Create admin setup function without conflicting with existing functions

-- Create a helper function to set up admin access for the current user
CREATE OR REPLACE FUNCTION public.make_current_user_admin()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  current_user_id uuid;
  user_email text;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN 'Error: No authenticated user found. Please log in first.';
  END IF;
  
  -- Get user email from auth.users
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = current_user_id;
  
  -- Insert or update profile with admin role
  INSERT INTO public.profiles (id, email, role) 
  VALUES (current_user_id, user_email, 'admin') 
  ON CONFLICT (id) DO UPDATE SET 
    role = 'admin',
    email = COALESCE(EXCLUDED.email, profiles.email);
    
  RETURN 'Success: User ' || COALESCE(user_email, current_user_id::text) || ' is now an admin.';
END;
$function$;

-- Add debugging function for troubleshooting
CREATE OR REPLACE FUNCTION public.debug_auth_status()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT jsonb_build_object(
    'auth_uid', auth.uid(),
    'is_admin_no_param', is_admin(),
    'profile_exists', EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid()),
    'profile_role', (SELECT role FROM profiles WHERE id = auth.uid()),
    'has_access_override', EXISTS(SELECT 1 FROM access_overrides WHERE user_id = auth.uid()),
    'conversations_count', (SELECT COUNT(*) FROM support_conversations),
    'messages_count', (SELECT COUNT(*) FROM support_messages)
  );
$function$;