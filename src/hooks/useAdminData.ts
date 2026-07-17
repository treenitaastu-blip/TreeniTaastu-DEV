import { useState, useEffect, useCallback } from 'react';
import { getAdminClient } from '@/utils/adminClient';
import type { Database } from '@/integrations/supabase/types';

type AdminUserRow = Database['public']['Functions']['get_admin_users_v2']['Returns'][number];

export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  created_at: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  profile_exists: boolean;
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

      const { data: usersData, error: usersError } = await adminClient
        .rpc('get_admin_users_v2');

      if (usersError) {
        console.error('Error loading admin users:', usersError);
        throw usersError;
      }

      const transformedUsers: UserProfile[] = ((usersData || []) as AdminUserRow[]).map((user) => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role || 'user',
        created_at: user.created_at,
        email_confirmed_at: user.email_confirmed_at,
        last_sign_in_at: user.last_sign_in_at,
        profile_exists: user.profile_exists,
        is_paid: user.is_paid ?? false,
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
