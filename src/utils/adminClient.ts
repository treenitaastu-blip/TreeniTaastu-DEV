import { createClient } from '@supabase/supabase-js';

// Admin client that uses service role to bypass RLS
// This allows admin operations without being blocked by RLS policies
export const getAdminClient = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dtxbrnrpzepwoxooqwlj.supabase.co';
  const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseServiceKey) {
    throw new Error('VITE_SUPABASE_SERVICE_ROLE_KEY is not configured');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};
