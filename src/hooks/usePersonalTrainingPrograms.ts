import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface PersonalTrainingProgram {
  id: string;
  title: string;
  description: string;
  duration_days: number;
  difficulty: string;
  status: string;
  created_at: string;
  assigned_to: string;
}

export interface PersonalTrainingState {
  programs: PersonalTrainingProgram[];
  loading: boolean;
  error: string | null;
}

export const usePersonalTrainingPrograms = () => {
  const { user } = useAuth();
  const [state, setState] = useState<PersonalTrainingState>({
    programs: [],
    loading: true,
    error: null
  });

  const loadPersonalTrainingPrograms = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, loading: false, programs: [] }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Get user's personal training programs
      const { data, error } = await supabase.rpc('get_user_active_program', {
        p_user_id: user.id
      });

      if (error) {
        console.log('No personal training programs found');
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          programs: [],
          error: null
        }));
        return;
      }

      // Filter out static programs (only show personal training)
      const personalPrograms = data?.filter(program => 
        program.title !== 'Kontorikeha Reset' && 
        program.title !== 'Static Program'
      ) || [];

      setState(prev => ({
        ...prev,
        programs: personalPrograms,
        loading: false,
        error: null
      }));

    } catch (error) {
      console.error('Error loading personal training programs:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load programs'
      }));
    }
  }, [user]);

  return {
    ...state,
    loadPersonalTrainingPrograms
  };
};
