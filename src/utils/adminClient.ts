import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';

// Service role key for admin operations
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0eGJybnJwemVwd294b29xd2xqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM5ODM4OCwiZXhwIjoyMDc0OTc0Mzg4fQ.B5tR2PVFY55A9OIwUjXULkOCMz6fswoCN2CjaaQHy6s';

// Global singleton for admin client to prevent multiple instances
const globalForAdminClient = globalThis as unknown as { 
  __adminClient?: ReturnType<typeof createClient> 
};

export const getAdminClient = () => {
  // Use global singleton to prevent multiple admin clients
  if (!globalForAdminClient.__adminClient) {
    globalForAdminClient.__adminClient = createClient(
      'https://dtxbrnrpzepwoxooqwlj.supabase.co',
      SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storage: {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {}
          },
          // Use unique storage key to prevent conflicts with main client
          storageKey: 'treenitaastu_admin_auth'
        }
      }
    );
  }
  return globalForAdminClient.__adminClient;
};
