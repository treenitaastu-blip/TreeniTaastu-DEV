import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';

// Service role key for admin operations
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0eGJybnJwemVwd294b29xd2xqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM5ODM4OCwiZXhwIjoyMDc0OTc0Mzg4fQ.B5tR2PVFY55A9OIwUjXULkOCMz6fswoCN2CjaaQHy6s';

// Create service role client for admin operations
let serviceRoleClient: ReturnType<typeof createClient> | null = null;

export const getAdminClient = () => {
  // Use service role client for admin operations
  if (!serviceRoleClient) {
    serviceRoleClient = createClient(
      'https://dtxbrnrpzepwoxooqwlj.supabase.co',
      SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          storage: {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {}
          }
        }
      }
    );
  }
  return serviceRoleClient;
};
