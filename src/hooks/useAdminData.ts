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

      // Test RPC function first
      const { data: testData, error: testError } = await adminClient.rpc('admin_test');
      if (testError) throw testError;
      console.log('Test RPC result:', testData);

      // Use custom RPC function to get all users
      const { data: users, error: rpcError } = await adminClient.rpc('admin_get_users');
      if (rpcError) throw rpcError;

      setUsers(users || []);
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
