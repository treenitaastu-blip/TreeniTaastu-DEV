import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useWeekendRedirect = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleWeekendClick = useCallback(async (dayNumber: number) => {
    try {
      // Navigate to mindfulness page
      navigate('/mindfulness', { 
        state: { 
          fromCalendar: true, 
          dayNumber,
          returnPath: '/programm' 
        } 
      });
    } catch (error) {
      console.error('Error navigating to mindfulness:', error);
      toast({
        title: "Viga",
        description: "Mindfulness lehele suunamine ebaõnnestus",
        variant: "destructive",
      });
    }
  }, [navigate, toast]);

  const markWeekendCompleted = useCallback(async (dayNumber: number, userId: string) => {
    try {
      // Track mindfulness completion for this weekend day
      const { error } = await supabase
        .from('user_analytics_events')
        .insert({
          user_id: userId,
          event_type: 'weekend_mindfulness_completed',
          event_data: {
            day_number: dayNumber,
            completed_at: new Date().toISOString(),
            source: 'calendar'
          }
        });

      if (error) throw error;

      // Show success message
      toast({
        title: "Nädalavahetus lõpetatud!",
        description: "Mindfulness sessioon on salvestatud",
      });

      return true;
    } catch (error) {
      console.error('Error marking weekend as completed:', error);
      toast({
        title: "Viga",
        description: "Nädalavahetuse märkimine lõpetatuks ebaõnnestus",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  const checkWeekendCompletion = useCallback(async (dayNumber: number, userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_analytics_events')
        .select('*')
        .eq('user_id', userId)
        .eq('event_type', 'weekend_mindfulness_completed')
        .eq('event_data->>day_number', dayNumber.toString())
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking weekend completion:', error);
      return false;
    }
  }, []);

  return {
    handleWeekendClick,
    markWeekendCompleted,
    checkWeekendCompletion
  };
};
