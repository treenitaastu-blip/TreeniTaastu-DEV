import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// Admin service client with service role key
const supabaseAdmin = createClient(
  'https://dtxbrnrpzepwoxooqwlj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0eGJybnJwemVwd294b29xd2xqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM5ODM4OCwiZXhwIjoyMDc0OTc0Mzg4fQ.B5tR2PVFY55A9OIwUjXULkOCMz6fswoCN2CjaaQHy6s'
);

export type UserProfile = {
  id: string;
  email: string | null;
  role: string;
  created_at: string;
  is_paid: boolean;
  trial_ends_at: string | null;
  current_period_end: string | null;
};

export function useAdminData() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all users from auth.users
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      if (authError) throw authError;

      // Get all profiles
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("*");
      if (profilesError) throw profilesError;

      // Get all subscribers
      const { data: subscribers, error: subscribersError } = await supabaseAdmin
        .from("subscribers")
        .select("*");
      if (subscribersError) throw subscribersError;

      // Combine the data
      const combinedUsers = authUsers.users.map(authUser => {
        const profile = profiles.find(p => p.id === authUser.id);
        const subscriber = subscribers.find(s => s.user_id === authUser.id);

        return {
          id: authUser.id,
          email: authUser.email,
          role: profile?.role || 'user',
          created_at: authUser.created_at,
          is_paid: subscriber?.status === 'active',
          trial_ends_at: subscriber?.trial_ends_at,
          current_period_end: subscriber?.expires_at,
        };
      });

      setUsers(combinedUsers);
    } catch (err) {
      console.error('Error loading admin data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return {
    users,
    loading,
    error,
    refetch: loadUsers
  };
}
