import { useState, useEffect, useCallback } from 'react';
import { getAdminClient } from '@/utils/adminClient';

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

      const adminClient = getAdminClient();

      // Get all profiles (this includes all users)
      const { data: profiles, error: profilesError } = await adminClient
        .from("profiles")
        .select("*");
      if (profilesError) throw profilesError;

      // Get all subscribers
      const { data: subscribers, error: subscribersError } = await adminClient
        .from("subscribers")
        .select("*");
      if (subscribersError) throw subscribersError;

      // Combine the data
      const combinedUsers = profiles.map(profile => {
        const subscriber = subscribers.find(s => s.user_id === profile.id);

        return {
          id: profile.id,
          email: profile.email,
          role: profile.role || 'user',
          created_at: profile.created_at,
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
