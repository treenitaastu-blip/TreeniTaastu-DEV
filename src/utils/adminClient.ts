import { supabase } from '@/integrations/supabase/client';

// Admin client that uses the regular client with user session
// The user must have admin role to access admin data
export const getAdminClient = () => {
  // Return the regular client - it already has the user's session
  // RLS policies will check if the user has admin role
  return supabase;
};
