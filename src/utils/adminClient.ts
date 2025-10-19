import { createClient } from '@supabase/supabase-js';

// Singleton admin service client with service role key
// Using minimal configuration to avoid GoTrueClient conflicts
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

export const getAdminClient = () => {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      'https://dtxbrnrpzepwoxooqwlj.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0eGJybnJwemVwd294b29xd2xqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM5ODM4OCwiZXhwIjoyMDc0OTc0Mzg4fQ.B5tR2PVFY55A9OIwUjXULkOCMz6fswoCN2CjaaQHy6s',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          // Use a completely different storage key to avoid conflicts
          storageKey: 'supabase-admin-service-role',
          // Disable auth flow entirely for service role
          flowType: 'implicit'
        },
        // Disable realtime to reduce client complexity
        realtime: {
          enabled: false
        }
      }
    );
  }
  return supabaseAdmin;
};
