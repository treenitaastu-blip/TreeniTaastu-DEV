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
import { KONTORIKEHA_RESET_PROGRAM_ID } from '@/constants/programs';

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

  // Get user's active static program
  // This hook is specifically for static programs, so we check user_programs directly
  // Users can have both PT and static programs active simultaneously
  const getActiveProgram = useCallback(async () => {
    if (!user) return null;

    try {
      // Check for active static program directly (not using RPC which prioritizes PT)
      const { data: userProgram, error: userProgramError } = await supabase
        .from('user_programs')
        .select('program_id, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (userProgramError) {
        console.error('Error getting active static program:', userProgramError);
        return null;
      }

      if (!userProgram || userProgram.status !== 'active') {
        // No active static program found
        return null;
      }

      // Fetch the program details
      const { data: program, error: programError } = await supabase
        .from('programs')
        .select('id, title, description, duration_weeks, difficulty, created_at')
        .eq('id', userProgram.program_id)
        .maybeSingle();

      if (programError) {
        console.error('Error fetching program details:', programError);
        return null;
      }

      if (!program) {
        return null;
      }

      // Convert to the expected format
      return {
        id: program.id,
        title: program.title,
        description: program.description,
        duration_days: (program.duration_weeks * 7),
        difficulty: program.difficulty || 'alustaja',
        status: 'available',
        created_at: program.created_at
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

      // Get active static program (already verified in getActiveProgram)
      const activeProgram = await getActiveProgram();
      
      if (!activeProgram) {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          hasActiveProgram: false,
          program: null,
          days: [],
          totalDays: 0,
          completedDays: 0,
          error: null // No error - just no active program
        }));
        return;
      }

      // Fetch user's actual start date from static_starts table
      // Only fetch if user actually has active program (prevent auto-start on browse)
      let userStartDate: Date | undefined = undefined;
      if (activeProgram.id === KONTORIKEHA_RESET_PROGRAM_ID) {
        const { data: staticStart, error: staticStartError } = await supabase
          .from('static_starts')
          .select('start_monday')
          .eq('user_id', user.id)
          .maybeSingle();

        if (staticStartError) {
          console.error('Error checking static_starts:', staticStartError);
        }

        // Only auto-create static_starts if user has active program but missing start date
        if (!staticStart?.start_monday && hasActualActiveProgram) {
          try {
            const { data: startDate, error: startError } = await supabase
              .rpc('start_static_program', { p_force: false });

            if (startError) {
              console.warn('Could not auto-create static_starts (will use fallback):', startError);
              // Continue without userStartDate - will use fallback logic
            } else if (startDate) {
              // Convert the returned date string to Date object
              userStartDate = new Date(startDate + 'T00:00:00');
            }
          } catch (err) {
            console.warn('Exception creating static_starts (will use fallback):', err);
            // Continue without userStartDate - will use fallback logic
          }
        } else if (staticStart?.start_monday) {
          // Convert the date string to a Date object (start_monday is a date, so it comes as a string)
          userStartDate = new Date(staticStart.start_monday + 'T00:00:00');
        }
      }

      // Load completion data for static program
      let completedProgramDayIds: string[] = [];
      let uniqueCompletedDayNumbers = new Set<number>();
      
      // Create a mapping of programday_id to day number
      let programDayToDayNumber: Record<string, number> = {};
      
      if (activeProgram.id === KONTORIKEHA_RESET_PROGRAM_ID) {
        // Get all programday records to map IDs to day numbers first
        const { data: programDays } = await supabase
          .from('programday')
          .select('id, week, day')
          .eq('program_id', activeProgram.id);
          
        if (programDays) {
          programDays.forEach(pd => {
            const dayNumber = ((pd.week - 1) * 5) + pd.day;
            programDayToDayNumber[pd.id] = dayNumber;
          });
        }
        
        // Load completion data
        const { data: progress, error: progressError } = await supabase
          .from('userprogress')
          .select('programday_id, completed_at, done')
          .eq('user_id', user.id)
          .eq('done', true);

        if (progressError) {
          console.error('Error loading progress:', progressError);
        } else {
          completedProgramDayIds = progress?.map(p => p.programday_id) || [];
          
          // Map completed programday_ids to day numbers
          completedProgramDayIds.forEach(programDayId => {
            const dayNumber = programDayToDayNumber[programDayId];
            if (dayNumber) {
              uniqueCompletedDayNumbers.add(dayNumber);
            }
          });
        }
      }

      // Override duration_days for Kontorikeha Reset before generating calendar days
      const programForCalendar = activeProgram.id === KONTORIKEHA_RESET_PROGRAM_ID
        ? { ...activeProgram, duration_days: 20 }
        : activeProgram;

      // Generate calendar days with user's actual start date
      const days = generateCalendarDays(programForCalendar, userStartDate);
      const today = getTallinnDate();

      // Update days with completion status
      const updatedDays = days.map(day => {
        let isCompleted = false;
        
        if (activeProgram.id === KONTORIKEHA_RESET_PROGRAM_ID) {
          // Check if this specific day is completed by mapping programday_id to day number
          isCompleted = completedProgramDayIds.some(programDayId => {
            const mappedDayNumber = programDayToDayNumber[programDayId];
            return mappedDayNumber === day.dayNumber;
          });
        }
        
        // Recalculate unlock status with completion info
        // Use user's actual start date for accurate unlock calculation
        const isUnlocked = shouldUnlockDay(day.dayNumber, userStartDate, isCompleted);
        const isLocked = !isUnlocked && !day.isWeekend;
        
        return {
          ...day,
          isCompleted,
          isUnlocked,
          isLocked
        };
      });

      // Count unique completed days, not total completions
      const completedDays = uniqueCompletedDayNumbers.size;

      // Override duration_days for Kontorikeha Reset (20 days = 4 weeks × 5 working days)
      const actualDurationDays = activeProgram.id === KONTORIKEHA_RESET_PROGRAM_ID 
        ? 20 
        : activeProgram.duration_days;

      // Update program object with correct duration
      const programWithCorrectDuration = {
        ...activeProgram,
        duration_days: actualDurationDays
      };

      setState(prev => ({
        ...prev,
        program: programWithCorrectDuration,
        days: updatedDays,
        totalDays: actualDurationDays,
        completedDays,
        loading: false,
        hasActiveProgram: hasActualActiveProgram, // Use actual check result
        error: null
      }));

    } catch (error: any) {
      console.error('Error loading program data:', error);
      const errorMessage = error?.message || 'Programmi andmete laadimine ebaõnnestus. Palun proovi hiljem uuesti.';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        hasActiveProgram: false,
        program: null,
        days: [],
        totalDays: 0,
        completedDays: 0
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

    } catch (error: any) {
      console.error('Error marking day completed:', error);
      // Error is handled in the calling component via toast
      throw error; // Re-throw so calling component can handle it
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
