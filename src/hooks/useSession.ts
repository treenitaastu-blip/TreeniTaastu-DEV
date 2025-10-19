import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useAuth } from '@/hooks/useAuth';

export function useSession() {
  const { session, status } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use the session from useAuth instead of calling getSession again
    setLoading(status === "loading");
  }, [session, status]);

  return { session, loading };
}
