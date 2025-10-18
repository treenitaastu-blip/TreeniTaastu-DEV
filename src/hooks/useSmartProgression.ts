import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  trackAnalysisFunctionError, 
  trackDataValidationError, 
  trackProgressionPermissionError, 
  trackProgressionNetworkError,
  trackInsufficientDataError,
  trackCalculationError,
  ProgressionFailureType
} from '@/utils/progressionMonitor';

export interface ProgramProgress {
  program_id: string | null;
  user_id: string | null;
  start_date: string | null;
  duration_weeks: number | null;
  status: string | null;
  completed_at: string | null;
  auto_progression_enabled: boolean | null;
  weeks_elapsed: number | null;
  progress_percentage: number | null;
  is_due_for_completion: boolean | null;
}

export interface ExerciseProgression {
  action: 'maintain' | 'increase_weight' | 'decrease_weight' | 'deload' | 'micro_increase';
  reason: string;
  current_weight: number | null;
  suggested_weight?: number | null;
  current_reps: string;
  suggested_reps?: string;
  avg_rpe: number | null;
  avg_rir?: number | null;
  rpe_trend?: number | null;
  volume_trend?: number | null;
  consistency_score?: number | null;
  confidence_score?: number | null;
  session_count: number;
  exercise_type?: 'compound' | 'isolation';
  deload_needed?: boolean;
  weeks_analyzed?: number;
  reasoning?: string;
  professional_notes?: string;
}

export interface AutoProgressionResult {
  success: boolean;
  program_id: string;
  updates_made: number;
  deload_exercises?: number;
  algorithm_version?: string;
  deload_applied?: boolean;
  program_avg_rpe?: number;
  total_sessions_analyzed?: number;
  professional_summary?: string;
  progressions: Array<{
    exercise_name: string;
    item_id: string;
    progression: ExerciseProgression;
  }>;
}

export const useSmartProgression = (programId?: string) => {
  const [programProgress, setProgramProgress] = useState<ProgramProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch program progress
  const fetchProgramProgress = async () => {
    if (!programId) {
      setProgramProgress(null);
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('v_program_progress')
        .select('*')
        .eq('program_id', programId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        console.warn('No program progress found for ID:', programId);
        setProgramProgress(null);
        return;
      }
      
      setProgramProgress(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch program progress';
      setError(errorMessage);
      console.error('Error fetching program progress:', err);
      setProgramProgress(null);
    } finally {
      setLoading(false);
    }
  };

  // Analyze exercise progression with optimized algorithm
  const analyzeExerciseProgression = async (clientItemId: string, weeksBack: number = 3): Promise<ExerciseProgression | null> => {
    const sessionId = `analysis_${Date.now()}`;
    const userId = user?.id;
    
    try {
      // Use optimized algorithm first
      const { data: optimizedData, error: optimizedError } = await supabase.rpc('analyze_exercise_progression_optimized', {
        p_client_item_id: clientItemId,
        p_weeks_back: weeksBack
      });

      if (!optimizedError && optimizedData) {
        return (optimizedData as unknown) as ExerciseProgression;
      }

      // Track optimized algorithm failure
      if (userId) {
        trackAnalysisFunctionError(userId, sessionId, optimizedError || 'Optimized algorithm failed', {
          programId,
          exerciseId: clientItemId,
          analysisData: { weeksBack, algorithm: 'optimized' }
        });
      }

      // Fallback to enhanced algorithm
      console.log('Optimized algorithm failed, falling back to enhanced:', optimizedError);
      const { data: enhancedData, error: enhancedError } = await supabase.rpc('analyze_exercise_progression_enhanced', {
        p_client_item_id: clientItemId,
        p_weeks_back: weeksBack
      });

      if (!enhancedError && enhancedData) {
        return (enhancedData as unknown) as ExerciseProgression;
      }

      // Track enhanced algorithm failure
      if (userId) {
        trackAnalysisFunctionError(userId, sessionId, enhancedError || 'Enhanced algorithm failed', {
          programId,
          exerciseId: clientItemId,
          analysisData: { weeksBack, algorithm: 'enhanced' }
        });
      }

      // Final fallback to original function
      console.log('Enhanced algorithm failed, falling back to original:', enhancedError);
      const { data: originalData, error: originalError } = await supabase.rpc('analyze_exercise_progression', {
        p_client_item_id: clientItemId,
        p_weeks_back: weeksBack
      });
      
      if (originalError) {
        // Track original algorithm failure
        if (userId) {
          trackAnalysisFunctionError(userId, sessionId, originalError, {
            programId,
            exerciseId: clientItemId,
            analysisData: { weeksBack, algorithm: 'original' }
          });
        }
        throw originalError;
      }
      
      return (originalData as unknown) as ExerciseProgression;
    } catch (err) {
      // Track general analysis failure
      if (userId) {
        trackAnalysisFunctionError(userId, sessionId, err, {
          programId,
          exerciseId: clientItemId,
          analysisData: { weeksBack, algorithm: 'all_failed' }
        });
      }
      
      console.error('All progression analysis methods failed:', err);
      return null;
    }
  };

  // Auto-progress entire program with optimized algorithm
  const autoProgressProgram = async (): Promise<AutoProgressionResult | null> => {
    if (!programId) {
      toast({
        title: "No Program Selected",
        description: "Please select a program to enable auto-progression.",
        variant: "destructive",
      });
      return null;
    }
    
    const sessionId = `auto_progress_${Date.now()}`;
    const userId = user?.id;
    
    try {
      // Try optimized auto-progression first
      const { data: optimizedData, error: optimizedError } = await supabase.rpc('auto_progress_program_optimized', {
        p_program_id: programId
      });

      if (!optimizedError && optimizedData) {
        const result = optimizedData as any; // Type assertion for database response
        
        if (result.success) {
          const deloadMessage = result.deload_applied || (result.deload_exercises > 0) 
            ? ` (${result.deload_exercises} exercises deloaded)` 
            : '';
          
          if (result.updates_made > 0) {
            toast({
              title: result.deload_applied ? "Deload Applied!" : "Program Updated!",
              description: `${result.updates_made} exercises adjusted using optimized algorithm${deloadMessage}.`,
            });
            await fetchProgramProgress();
          } else {
            toast({
              title: "No Updates Needed",
              description: "Your program is already optimally configured based on your recent performance.",
            });
          }
          return result as AutoProgressionResult;
        }
      }

      // Fallback to enhanced auto-progression
      console.log('Optimized auto-progression failed, falling back to enhanced:', optimizedError);
      const { data: enhancedData, error: enhancedError } = await supabase.rpc('auto_progress_program_enhanced', {
        p_program_id: programId
      });

      if (!enhancedError && enhancedData) {
        const result = enhancedData as unknown as AutoProgressionResult;
        
        if (result.success && result.updates_made > 0) {
          const summaryMsg = result.professional_summary || 
            `${result.updates_made} exercises have been automatically adjusted based on your performance data.`;
          
          toast({
            title: result.deload_applied ? "Deload Applied!" : "Program Updated!",
            description: summaryMsg,
          });
          
          await fetchProgramProgress();
        } else if (result.success && result.updates_made === 0) {
          toast({
            title: "No Updates Needed",
            description: result.professional_summary || "Your program is already optimally configured based on your recent performance.",
          });
        }
        return result;
      }
      
      // Final fallback to original function
      console.log('Enhanced auto-progression failed, falling back to original:', enhancedError);
      const { data: originalData, error: originalError } = await supabase.rpc('auto_progress_program', {
        p_program_id: programId
      });
      
      if (originalError) throw originalError;
      
      const result = originalData as unknown as AutoProgressionResult;
      if (result?.success && result.updates_made > 0) {
        toast({
          title: "Program Updated!",
          description: `${result.updates_made} exercises adjusted using standard progression.`,
        });
        await fetchProgramProgress();
      }
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to auto-progress program';
      setError(errorMessage);
      
      // Track progression analysis failure
      if (userId) {
        trackAnalysisFunctionError(userId, sessionId, err, {
          programId,
          analysisData: { algorithm: 'auto_progress_program' }
        });
      }
      
      // Enhanced error logging for debugging
      console.error('Auto-progression error:', {
        error: err,
        programId,
        timestamp: new Date().toISOString(),
        errorType: err instanceof Error ? err.constructor.name : 'Unknown',
        stack: err instanceof Error ? err.stack : undefined
      });
      
      // Track the error for analytics
      try {
        await supabase.from('user_analytics_events').insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          event_type: 'progression_analysis_failed',
          event_data: {
            program_id: programId,
            error_message: errorMessage,
            error_type: err instanceof Error ? err.constructor.name : 'Unknown'
          }
        });
      } catch (analyticsError) {
        console.error('Failed to track progression error:', analyticsError);
      }
      
      toast({
        title: "Progression Analysis Failed",
        description: "Unable to analyze your workout data. Your program will continue with current settings.",
        variant: "destructive",
      });
      return null;
    }
  };

  // Check and complete due programs
  const completeDuePrograms = async () => {
    try {
      const { data, error } = await supabase.rpc('complete_due_programs');
      
      if (error) throw error;
      
      const result = (data as unknown) as { completed_programs: number; timestamp: string };
      
      if (result.completed_programs > 0) {
        toast({
          title: "Program Completed!",
          description: `Congratulations! Your training program has been completed.`,
        });
        
        // Refresh program progress
        await fetchProgramProgress();
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete due programs';
      console.error('Error completing due programs:', {
        error: err,
        programId,
        timestamp: new Date().toISOString(),
        errorType: err instanceof Error ? err.constructor.name : 'Unknown'
      });
      
      // Track the error for analytics
      try {
        await supabase.from('user_analytics_events').insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          event_type: 'program_completion_failed',
          event_data: {
            program_id: programId,
            error_message: errorMessage,
            error_type: err instanceof Error ? err.constructor.name : 'Unknown'
          }
        });
      } catch (analyticsError) {
        console.error('Failed to track completion error:', analyticsError);
      }
      
      return null;
    }
  };

  // Update program settings
  const updateProgramSettings = async (updates: {
    duration_weeks?: number;
    auto_progression_enabled?: boolean;
    status?: string;
  }) => {
    if (!programId) return;
    
    try {
      const { error } = await supabase
        .from('client_programs')
        .update(updates)
        .eq('id', programId);

      if (error) throw error;
      
      toast({
        title: "Settings Updated",
        description: "Program settings have been successfully updated.",
      });
      
      await fetchProgramProgress();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update program settings';
      setError(errorMessage);
      
      // Enhanced error logging for debugging
      console.error('Program settings update error:', {
        error: err,
        programId,
        updates,
        timestamp: new Date().toISOString(),
        errorType: err instanceof Error ? err.constructor.name : 'Unknown'
      });
      
      // Track the error for analytics
      try {
        await supabase.from('user_analytics_events').insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          event_type: 'program_settings_update_failed',
          event_data: {
            program_id: programId,
            updates,
            error_message: errorMessage,
            error_type: err instanceof Error ? err.constructor.name : 'Unknown'
          }
        });
      } catch (analyticsError) {
        console.error('Failed to track settings update error:', analyticsError);
      }
      
      toast({
        title: "Settings Update Failed",
        description: "Unable to update program settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (programId) {
      fetchProgramProgress();
    }
  }, [programId]);

  return {
    programProgress,
    loading,
    error,
    fetchProgramProgress,
    analyzeExerciseProgression,
    autoProgressProgram,
    completeDuePrograms,
    updateProgramSettings,
  };
};