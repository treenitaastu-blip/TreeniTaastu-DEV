import { supabase } from '@/integrations/supabase/client';

// Admin client that uses the regular client with user session
// The user must have admin role to access admin data
export const getAdminClient = () => {
  // Return the regular client - it already has the user's session
  // RLS policies will check if the user has admin role using is_admin_unified()
  return supabase;
};

// Helper function to check if current user is admin
export const checkAdminAccess = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('is_admin_unified');
    if (error) {
      console.error('Admin check error:', error);
      return false;
    }
    return data || false;
  } catch (error) {
    console.error('Admin check failed:', error);
    return false;
  }
};
