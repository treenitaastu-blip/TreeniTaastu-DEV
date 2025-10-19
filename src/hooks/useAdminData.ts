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

      // Use the new admin function that bypasses RLS
      const { data: usersData, error: usersError } = await adminClient
        .rpc('get_admin_users');
      
      if (usersError) {
        console.error('Error loading admin users:', usersError);
        throw usersError;
      }

      // Transform the data to match our expected format
      const transformedUsers = (usersData || []).map((user: any) => ({
        id: user.id,
        email: user.email,
        role: user.role || 'user',
        created_at: user.created_at,
        is_paid: user.is_paid || false,
        trial_ends_at: user.trial_ends_at,
        current_period_end: user.current_period_end,
      }));

      setUsers(transformedUsers);
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
