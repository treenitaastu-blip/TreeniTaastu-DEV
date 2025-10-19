import { supabase } from '@/integrations/supabase/client';

// Admin client that uses the regular client with user session
// This ensures auth.uid() works properly in admin functions
export const getAdminClient = () => {
  // Return the regular client - it already has the user's session
  return supabase;
};
