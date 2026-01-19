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

      // Filter out personal training programs - only return static programs
      const staticProgram = data?.find(program => 
        program.title === 'Kontorikeha Reset' || 
        program.title === 'Static Program'
      );
      
      if (staticProgram) {
        return staticProgram;
      }
      
      // If no static program found, return fallback
      console.log('No static program found, using fallback for Kontorikeha Reset');
      return {
        id: 'kontorikeha-reset-fallback',
        title: 'Kontorikeha Reset',
        description: '20-päevane programm kontoritöötajatele, mis aitab parandada kehahoiakut ja vähendada põhja- ja kaelavalusid.',
        duration_days: 20,
        difficulty: 'alustaja',
        status: 'available',
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting active program:', error);
      return null;
    }
  }, [user]);

  // Generate calendar days based on program
  const generateCalendarDays = useCallback((program: ProgramInfo, userStartDate?: Date): CalendarDay[] => {
    const days: CalendarDay[] = [];
    const today = getTallinnDate();
    
    // Use user's actual start date if provided, otherwise use current week's Monday
    let programStartDate: Date;
    if (userStartDate) {
      programStartDate = new Date(userStartDate);
      programStartDate.setHours(0, 0, 0, 0);
    } else {
      // Fallback to current week's Monday
      programStartDate = new Date(today);
      const dayOfWeek = programStartDate.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Days back to Monday
      programStartDate.setDate(programStartDate.getDate() - daysToMonday);
      programStartDate.setHours(0, 0, 0, 0);
    }
    
    for (let dayNumber = 1; dayNumber <= program.duration_days; dayNumber++) {
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
      const isCompleted = false; // Will be loaded from database
      const isUnlocked = shouldUnlockDay(dayNumber, programStartDate, isCompleted);
      const isLocked = !isUnlocked && !isWeekendDay;
      
      days.push({
        dayNumber,
        date: currentDate,
        isWeekend: isWeekendDay,
        isUnlocked,
        isCompleted,
        isLocked,
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

      // Fetch user's actual start date from static_starts table
      // Auto-create if missing for Kontorikeha Reset program
      let userStartDate: Date | undefined = undefined;
      if (activeProgram.title === 'Kontorikeha Reset') {
        const { data: staticStart, error: staticStartError } = await supabase
          .from('static_starts')
          .select('start_monday')
          .eq('user_id', user.id)
          .maybeSingle();

        if (staticStartError) {
          console.error('Error checking static_starts:', staticStartError);
        }

        // If no static_starts entry exists, auto-create it
        if (!staticStart?.start_monday) {
          try {
            const { data: startDate, error: startError } = await supabase
              .rpc('start_static_program', { p_force: false });

            if (startError) {
              console.warn('Could not auto-create static_starts (will use fallback):', startError);
              // Continue without userStartDate - will use fallback logic
            } else if (startDate) {
              // Convert the returned date string to Date object
              userStartDate = new Date(startDate + 'T00:00:00');
              console.log('Auto-created static_starts with start date:', startDate);
            }
          } catch (err) {
            console.warn('Exception creating static_starts (will use fallback):', err);
            // Continue without userStartDate - will use fallback logic
          }
        } else if (staticStart?.start_monday) {
          // Convert the date string to a Date object (start_monday is a date, so it comes as a string)
          userStartDate = new Date(staticStart.start_monday + 'T00:00:00');
          // #region agent log
          if (typeof window !== 'undefined') {
            console.log('[DEBUG useProgramCalendarState] User start date loaded', { userId: user.id, startMonday: staticStart.start_monday, userStartDate: userStartDate.toISOString() });
          }
          // #endregion
        }
      }

      // #region agent log
      if (typeof window !== 'undefined') {
        console.log('[DEBUG useProgramCalendarState] Before generating calendar days', { hasUserStartDate: !!userStartDate, userStartDate: userStartDate?.toISOString(), programTitle: activeProgram.title });
      }
      // #endregion

      // Generate calendar days with user's actual start date
      const days = generateCalendarDays(activeProgram, userStartDate);
      const today = getTallinnDate();
      
      // Load completion data for Kontorikeha Reset program
      let completedProgramDayIds: string[] = [];
      let uniqueCompletedDayNumbers = new Set<number>();
      
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
            if (mappedDayNumber === day.dayNumber) {
              uniqueCompletedDayNumbers.add(day.dayNumber);
              return true;
            }
            return false;
          });
        }
        
        // Recalculate unlock status with completion info
        // Use user's actual start date for accurate unlock calculation
        const isUnlocked = shouldUnlockDay(day.dayNumber, userStartDate, isCompleted);
        const isLocked = !isUnlocked && !day.isWeekend;
        
        // #region agent log
        if (typeof window !== 'undefined' && day.dayNumber <= 6) {
          console.log('[DEBUG useProgramCalendarState] Day unlock status calculated', { dayNumber: day.dayNumber, isCompleted, isUnlocked, isLocked, userStartDate: userStartDate?.toISOString(), isWeekend: day.isWeekend });
        }
        // #endregion
        
        return {
          ...day,
          isCompleted,
          isUnlocked,
          isLocked
        };
      });

      // Count unique completed days, not total completions
      const completedDays = uniqueCompletedDayNumbers.size;

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
