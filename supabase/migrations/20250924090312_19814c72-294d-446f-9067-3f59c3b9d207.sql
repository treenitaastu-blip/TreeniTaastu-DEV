-- Create a test login function and improve admin access
CREATE OR REPLACE FUNCTION public.test_admin_login(test_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  admin_user_id uuid;
  result jsonb;
BEGIN
  -- Find admin user by email
  SELECT id INTO admin_user_id 
  FROM profiles 
  WHERE email = test_email AND role = 'admin';
  
  IF admin_user_id IS NULL THEN
    -- Try to find any user with this email and make them admin
    SELECT id INTO admin_user_id 
    FROM profiles 
    WHERE email = test_email;
    
    IF admin_user_id IS NOT NULL THEN
      UPDATE profiles SET role = 'admin' WHERE id = admin_user_id;
    END IF;
  END IF;
  
  -- Return debug info
  SELECT jsonb_build_object(
    'found_user', admin_user_id IS NOT NULL,
    'user_id', admin_user_id,
    'email', test_email,
    'conversations', (SELECT COUNT(*) FROM support_conversations),
    'active_conversations', (SELECT COUNT(*) FROM support_conversations WHERE status = 'active'),
    'messages', (SELECT COUNT(*) FROM support_messages),
    'profiles_count', (SELECT COUNT(*) FROM profiles)
  ) INTO result;
  
  RETURN result;
END;
$function$;

-- Ensure admin policies allow viewing all conversations
DROP POLICY IF EXISTS "Admins can view all conversations" ON support_conversations;
CREATE POLICY "Admins can view all conversations" 
ON support_conversations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) 
  OR 
  EXISTS (
    SELECT 1 FROM access_overrides ao 
    WHERE ao.user_id = auth.uid() 
    AND (ao.expires_at IS NULL OR ao.expires_at > now())
  )
);

-- Ensure admin policies allow viewing all messages
DROP POLICY IF EXISTS "Admins can view all messages" ON support_messages;
CREATE POLICY "Admins can view all messages" 
ON support_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) 
  OR 
  EXISTS (
    SELECT 1 FROM access_overrides ao 
    WHERE ao.user_id = auth.uid() 
    AND (ao.expires_at IS NULL OR ao.expires_at > now())
  )
);