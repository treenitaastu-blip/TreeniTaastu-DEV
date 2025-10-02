import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getTallinnDate, dateKeyTallinn } from '@/lib/workweek';

// Static program progression interface - repeatable 20-day cycles
export interface StaticProgramProgress {
  total_days: number;
  completed_days: number;
  current_week: number;
  current_day: number;
  current_cycle: number;
  day_in_cycle: number;
  progress_percentage: number;
  streak_days: number;
  has_started: boolean;
  can_complete_today: boolean;
  completed_today: boolean;
}

export const useStaticProgression = (userId?: string) => {
  const [staticProgress, setStaticProgress] = useState<StaticProgramProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchStaticProgress = async () => {
    if (!userId) {
      setStaticProgress(null);
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Get current program day using new function
      const { data: currentDayData, error: currentDayError } = await supabase
        .rpc('get_user_current_program_day', { p_user_id: userId });

      if (currentDayError) throw currentDayError;

      // Get status from v_static_status
      const { data: statusData, error: statusError } = await supabase
        .from('v_static_status')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (statusError) throw statusError;

      // Get all completed sessions for this user
      const { data: progressData, error: progressError } = await supabase
        .from('userprogress')
        .select('programday_id, completed_at')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });

      if (progressError) throw progressError;

      const completedCount = progressData?.length || 0;
      const currentDay = currentDayData?.[0];
      
      // Check if today's workout is already completed (using Tallinn timezone)
      const today = dateKeyTallinn(getTallinnDate());
      const completedToday = progressData?.some(p => {
        const completedDate = new Date(p.completed_at);
        const completedDateKey = dateKeyTallinn(completedDate);
        return p.programday_id === currentDay?.programday_id && completedDateKey === today;
      }) || false;

      // Calculate streak from recent completions (last 30 days to be safe, using Tallinn timezone)
      const tallinnNow = getTallinnDate();
      const recentDates = progressData
        ?.map(p => {
          const completedDate = new Date(p.completed_at);
          return dateKeyTallinn(completedDate);
        })
        .filter(Boolean)
        .filter(date => {
          const completedDate = new Date(date);
          const daysDiff = (tallinnNow.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysDiff <= 30;
        })
        .sort();

      let streakDays = 0;
      if (recentDates && recentDates.length > 0) {
        let checkDate = today;
        const recentDatesSet = new Set(recentDates);
        
        while (recentDatesSet.has(checkDate)) {
          streakDays++;
          const prevDate = new Date(checkDate + 'T00:00:00');
          prevDate.setDate(prevDate.getDate() - 1);
          checkDate = dateKeyTallinn(prevDate);
        }
      }

      const progress: StaticProgramProgress = {
        total_days: 20, // Fixed 20-day cycle
        completed_days: completedCount,
        current_week: currentDay?.week || 1,
        current_day: currentDay?.day || 1,
        current_cycle: currentDay?.cycle_number || 0,
        day_in_cycle: currentDay?.day_in_cycle || 1,
        progress_percentage: Math.round((completedCount / 20) * 100),
        streak_days: streakDays,
        has_started: statusData?.status === 'active' || false,
        can_complete_today: currentDay?.can_complete || false,
        completed_today: completedToday
      };

      setStaticProgress(progress);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch static program progress';
      setError(errorMessage);
      if (import.meta.env.DEV) console.error('Error fetching static program progress:', err);
      setStaticProgress(null);
    } finally {
      setLoading(false);
    }
  };

  // Complete today's workout
  const completeToday = async (programdayId: string) => {
    if (!userId) {
      console.error('completeToday: No userId');
      return null;
    }

    console.log('completeToday called with:', { userId, programdayId });

    try {
      const { data, error } = await supabase
        .rpc('complete_static_program_day', { 
          p_user_id: userId, 
          p_programday_id: programdayId 
        });

      console.log('RPC response:', { data, error });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      // Refresh progress after completion
      console.log('Refreshing progress...');
      await fetchStaticProgress();
      console.log('Progress refreshed');
      
      return data;
    } catch (err) {
      console.error('Error completing workout:', err);
      if (import.meta.env.DEV) console.error('Error completing workout:', err);
      throw err;
    }
  };

  // Start the static program  
  const startProgram = async () => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .rpc('start_static_program');

      if (error) throw error;

      // Refresh progress after starting
      await fetchStaticProgress();
      
      return data;
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error starting program:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (userId) {
      fetchStaticProgress();
    }
  }, [userId]);

  return {
    staticProgress,
    loading,
    error,
    fetchStaticProgress,
    completeToday,
    startProgram,
  };
};