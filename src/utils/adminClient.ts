import { createClient } from '@supabase/supabase-js';

// Custom storage implementation to avoid conflicts with regular client
const adminStorage = {
  getItem: (key: string) => {
    // Use a completely different storage namespace
    return localStorage.getItem(`admin.${key}`);
  },
  setItem: (key: string, value: string) => {
    localStorage.setItem(`admin.${key}`, value);
  },
  removeItem: (key: string) => {
    localStorage.removeItem(`admin.${key}`);
  }
};

// Singleton admin service client with service role key
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

export const getAdminClient = () => {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      'https://dtxbrnrpzepwoxooqwlj.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0eGJybnJwemVwd294b29xd2xqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM5ODM4OCwiZXhwIjoyMDc0OTc0Mzg4fQ.B5tR2PVFY55A9OIwUjXULkOCMz6fswoCN2CjaaQHy6s',
      {
        auth: {
          persistSession: false, // Don't persist session for admin client
          autoRefreshToken: false, // Don't auto refresh for admin client
          storage: adminStorage, // Use custom storage to avoid conflicts
          detectSessionInUrl: false, // Don't detect sessions in URL
        }
      }
    );
  }
  return supabaseAdmin;
};
