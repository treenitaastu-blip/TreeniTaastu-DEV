import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAccess } from './useAccess';

export interface ProgramAccessState {
  loading: boolean;
  hasAssignedPrograms: boolean;
  isTrialUser: boolean;
  isPaidUser: boolean;
  canAccessPrograms: boolean;
  shouldShowUpgradePrompt: boolean;
  error: string | null;
}

export function useProgramAccess(): ProgramAccessState {
  const { user } = useAuth();
  const { canStatic, canPT, loading: accessLoading } = useAccess();
  const [hasAssignedPrograms, setHasAssignedPrograms] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAssignedPrograms = useCallback(async () => {
    if (!user) {
      setHasAssignedPrograms(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check if user has any assigned programs
      const { data: programs, error: programsError } = await supabase
        .from('client_programs')
        .select('id')
        .eq('assigned_to', user.id)
        .not('assigned_to', 'is', null)
        .limit(1);

      if (programsError) throw programsError;

      setHasAssignedPrograms((programs?.length || 0) > 0);
    } catch (err) {
      console.error('Error checking assigned programs:', err);
      setError(err instanceof Error ? err.message : 'Failed to check programs');
      setHasAssignedPrograms(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkAssignedPrograms();
  }, [checkAssignedPrograms]);

  // Determine user status
  const isTrialUser = !canStatic && !canPT; // No paid access
  const isPaidUser = canStatic || canPT; // Has paid access
  
  // Determine access logic
  const canAccessPrograms = isPaidUser || (isTrialUser && hasAssignedPrograms);
  const shouldShowUpgradePrompt = isTrialUser && !hasAssignedPrograms;

  return {
    loading: loading || accessLoading,
    hasAssignedPrograms,
    isTrialUser,
    isPaidUser,
    canAccessPrograms,
    shouldShowUpgradePrompt,
    error
  };
}
