import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  getTallinnDate, 
  isWeekend, 
  isAfterUnlockTime, 
  shouldUnlockDay, 
  formatTimeUntilUnlock 
} from '@/lib/workweek';
import { CalendarDay } from '@/components/calendar/DayTile';

interface ProgramInfo {
  id: string;
  title: string;
  description: string;
  duration_days: number;
  difficulty: string;
}

interface ProgramCalendarState {
  program: ProgramInfo | null;
  days: CalendarDay[];
  totalDays: number;
  completedDays: number;
  loading: boolean;
  error: string | null;
  hasActiveProgram: boolean;
}

export const useProgramCalendarState = () => {
  const { user } = useAuth();
  const [state, setState] = useState<ProgramCalendarState>({
    program: null,
    days: [],
    totalDays: 0,
    completedDays: 0,
    loading: true,
    error: null,
    hasActiveProgram: false
  });

  // Get user's active program
  const getActiveProgram = useCallback(async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.rpc('get_user_active_program', {
        p_user_id: user.id
      });

      if (error) {
        console.log('Database function not available, using fallback for Kontorikeha Reset');
        // Fallback: return Kontorikeha Reset program
        return {
          id: 'kontorikeha-reset-fallback', // Use string ID for fallback, not UUID
          title: 'Kontorikeha Reset',
          description: '20-päevane programm kontoritöötajatele, mis aitab parandada kehahoiakut ja vähendada põhja- ja kaelavalusid.',
          duration_days: 20,
          difficulty: 'alustaja',
          status: 'available',
          created_at: new Date().toISOString()
        };
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error getting active program:', error);
      return null;
    }
  }, [user]);

  // Generate calendar days based on program
  const generateCalendarDays = useCallback((program: ProgramInfo): CalendarDay[] => {
    const days: CalendarDay[] = [];
    const today = getTallinnDate();
    
    for (let dayNumber = 1; dayNumber <= program.duration_days; dayNumber++) {
      // Calculate the date for this day (assuming program starts on a Monday)
      const programStartDate = new Date(today);
      const dayOfWeek = programStartDate.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Days back to Monday
      programStartDate.setDate(programStartDate.getDate() - daysToMonday);
      
      // Add days to get to this day number (only weekdays)
      let currentDate = new Date(programStartDate);
      let weekdaysAdded = 0;
      
      while (weekdaysAdded < dayNumber) {
        if (!isWeekend(currentDate)) {
          weekdaysAdded++;
        }
        if (weekdaysAdded < dayNumber) {
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
      
      const isWeekendDay = isWeekend(currentDate);
      const isUnlocked = shouldUnlockDay(dayNumber, today);
      const isCompleted = false; // Will be loaded from database
      
      days.push({
        dayNumber,
        date: currentDate,
        isWeekend: isWeekendDay,
        isUnlocked,
        isCompleted,
        isStarted: false // Will be loaded from database
      });
    }
    
    return days;
  }, []);

  // Load program data and calendar state
  const loadProgramData = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, loading: false, hasActiveProgram: false }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Get active program
      const activeProgram = await getActiveProgram();
      
      if (!activeProgram) {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          hasActiveProgram: false,
          error: 'No active program found'
        }));
        return;
      }

      // Generate calendar days
      const days = generateCalendarDays(activeProgram);
      
      // Load completion data for Kontorikeha Reset program
      let completedProgramDayIds: string[] = [];
      let completedDays = 0;
      
      if (activeProgram.title === 'Kontorikeha Reset') {
        const { data: progress, error: progressError } = await supabase
          .from('userprogress')
          .select('programday_id, completed_at, done')
          .eq('user_id', user.id)
          .eq('done', true);

        if (progressError) {
          console.error('Error loading progress:', progressError);
        } else {
          completedProgramDayIds = progress?.map(p => p.programday_id) || [];
          completedDays = progress?.length || 0;
        }
      }

      // Create a mapping of programday_id to day number for Kontorikeha Reset
      let programDayToDayNumber: Record<string, number> = {};
      
      if (activeProgram.title === 'Kontorikeha Reset') {
        // Get all programday records to map IDs to day numbers
        const { data: programDays } = await supabase
          .from('programday')
          .select('id, week, day');
          
        if (programDays) {
          programDays.forEach(pd => {
            const dayNumber = ((pd.week - 1) * 5) + pd.day;
            programDayToDayNumber[pd.id] = dayNumber;
          });
        }
      }

      // Update days with completion status
      const updatedDays = days.map(day => {
        let isCompleted = false;
        
        if (activeProgram.title === 'Kontorikeha Reset') {
          // Check if this specific day is completed by mapping programday_id to day number
          isCompleted = completedProgramDayIds.some(programDayId => {
            const mappedDayNumber = programDayToDayNumber[programDayId];
            return mappedDayNumber === day.dayNumber;
          });
        }
        
        return {
          ...day,
          isCompleted
        };
      });

      setState(prev => ({
        ...prev,
        program: activeProgram,
        days: updatedDays,
        totalDays: activeProgram.duration_days,
        completedDays,
        loading: false,
        hasActiveProgram: true,
        error: null
      }));

    } catch (error) {
      console.error('Error loading program data:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load program data',
        hasActiveProgram: false
      }));
    }
  }, [user, getActiveProgram, generateCalendarDays]);

  // Refresh calendar
  const refreshCalendar = useCallback(() => {
    loadProgramData();
  }, [loadProgramData]);

  // Mark day as completed
  const markDayCompleted = useCallback(async (dayNumber: number) => {
    if (!user || !state.program) return;

    try {
      // This would need to be implemented based on your programday structure
      // For now, we'll just update the local state
      setState(prev => ({
        ...prev,
        days: prev.days.map(day => 
          day.dayNumber === dayNumber 
            ? { ...day, isCompleted: true }
            : day
        ),
        completedDays: prev.completedDays + 1
      }));

    } catch (error) {
      console.error('Error marking day completed:', error);
    }
  }, [user, state.program]);

  useEffect(() => {
    loadProgramData();
  }, [loadProgramData]);

  return {
    ...state,
    refreshCalendar,
    markDayCompleted
  };
};
