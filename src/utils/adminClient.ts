import { supabase } from '@/integrations/supabase/client';

// Service role key for admin operations
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0eGJybnJwemVwd294b29xd2xqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM5ODM4OCwiZXhwIjoyMDc0OTc0Mzg4fQ.B5tR2PVFY55A9OIwUjXULkOCMz6fswoCN2CjaaQHy6s';

// Simple wrapper that uses the regular client but adds service role headers to RPC calls
// This avoids creating multiple Supabase clients and GoTrueClient instances
export const getAdminClient = () => {
  return {
    ...supabase,
    // Override RPC calls to use service role key
    rpc: (fn: string, args?: any, options?: any) => {
      return supabase.rpc(fn, args, {
        ...options,
        headers: {
          ...options?.headers,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
        }
      });
    }
  };
};
