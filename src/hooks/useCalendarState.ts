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

interface CalendarState {
  days: CalendarDay[];
  totalDays: number;
  completedDays: number;
  loading: boolean;
  error: string | null;
}

export const useCalendarState = () => {
  const { user } = useAuth();
  const [state, setState] = useState<CalendarState>({
    days: [],
    totalDays: 20,
    completedDays: 0,
    loading: true,
    error: null
  });

  // Generate 20-day calendar with weekends
  const generateCalendarDays = useCallback((): CalendarDay[] => {
    const days: CalendarDay[] = [];
    const today = getTallinnDate();
    
    for (let dayNumber = 1; dayNumber <= 20; dayNumber++) {
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
      const isUnlocked = shouldUnlockDay(dayNumber);
      const isLocked = !isUnlocked && !isWeekendDay;
      
      days.push({
        dayNumber,
        isWeekend: isWeekendDay,
        isUnlocked,
        isCompleted: false, // Will be updated from database
        isLocked,
        unlockTime: isLocked ? formatTimeUntilUnlock() : undefined
      });
    }
    
    return days;
  }, []);

  // Fetch motivational quote
  const fetchRandomQuote = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_random_motivational_quote');
      if (error) throw error;
      return data?.[0] || { quote: "Jõud tuleb mitte füüsilise võime, vaid võitmatu tahtega.", author: "Mahatma Gandhi" };
    } catch (error) {
      console.error('Error fetching quote:', error);
      return { quote: "Jõud tuleb mitte füüsilise võime, vaid võitmatu tahtega.", author: "Mahatma Gandhi" };
    }
  }, []);

  // Fetch completion status for all days
  const fetchCompletionStatus = useCallback(async (days: CalendarDay[]) => {
    if (!user?.id) return days;

    try {
      // Check if user is authenticated
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        console.warn('User not authenticated, skipping completion status fetch');
        return days;
      }
      // Get completed weekdays
      const { data: weekdayCompletions, error: weekdayError } = await supabase
        .from('user_analytics_events')
        .select('event_data')
        .eq('user_id', user.id)
        .eq('event_type', 'static_program_completed')
        .not('event_data->>day_number', 'is', null);

      if (weekdayError) throw weekdayError;

      // Get completed weekends
      const { data: weekendCompletions, error: weekendError } = await supabase
        .from('user_analytics_events')
        .select('event_data')
        .eq('user_id', user.id)
        .eq('event_type', 'weekend_mindfulness_completed')
        .not('event_data->>day_number', 'is', null);

      if (weekendError) throw weekendError;

      // Create completion map
      const completedDays = new Set<number>();
      
      weekdayCompletions?.forEach((completion: any) => {
        const dayNumber = parseInt(completion.event_data?.day_number);
        if (dayNumber) completedDays.add(dayNumber);
      });
      
      weekendCompletions?.forEach((completion: any) => {
        const dayNumber = parseInt(completion.event_data?.day_number);
        if (dayNumber) completedDays.add(dayNumber);
      });

      // Update days with completion status
      return days.map(day => ({
        ...day,
        isCompleted: completedDays.has(day.dayNumber)
      }));

    } catch (error: any) {
      console.error('Error fetching completion status:', error);
      
      // If it's a permission error, log it but don't break the app
      if (error?.code === '42501' || error?.message?.includes('permission denied')) {
        console.warn('Permission denied for analytics events - user may not be authenticated or RLS policy issue');
        // Return days without completion status - app will still work
        return days;
      }
      
      // For other errors, also return days to keep app functional
      return days;
    }
  }, [user?.id]);

  // Load calendar data
  const loadCalendarData = useCallback(async () => {
    if (!user?.id) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Generate calendar days
      let days = generateCalendarDays();
      
      // Fetch completion status
      days = await fetchCompletionStatus(days);
      
      // Add quotes to locked days
      const lockedDays = days.filter(day => day.isLocked);
      if (lockedDays.length > 0) {
        const quote = await fetchRandomQuote();
        lockedDays.forEach(day => {
          day.quote = quote;
        });
      }
      
      // Calculate completed days
      const completedDays = days.filter(day => day.isCompleted).length;
      
      setState({
        days,
        totalDays: 20,
        completedDays,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Error loading calendar data:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load calendar data'
      }));
    }
  }, [user?.id, generateCalendarDays, fetchCompletionStatus, fetchRandomQuote]);

  // Refresh calendar data
  const refreshCalendar = useCallback(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  // Mark day as completed
  const markDayCompleted = useCallback(async (dayNumber: number) => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('user_analytics_events')
        .insert({
          user_id: user.id,
          event_type: 'static_program_completed',
          event_data: {
            day_number: dayNumber,
            completed_at: new Date().toISOString(),
            source: 'calendar'
          }
        });

      if (error) throw error;

      // Update local state
      setState(prev => ({
        ...prev,
        days: prev.days.map(day => 
          day.dayNumber === dayNumber 
            ? { ...day, isCompleted: true }
            : day
        ),
        completedDays: prev.completedDays + 1
      }));

      return true;
    } catch (error) {
      console.error('Error marking day as completed:', error);
      return false;
    }
  }, [user?.id]);

  // Load data on mount and when user changes
  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  return {
    ...state,
    refreshCalendar,
    markDayCompleted
  };
};
