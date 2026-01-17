// src/hooks/useTrackEvent.ts
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type EventData = {
  button_name?: string;
  page_location?: string;
  destination?: string;
  source?: string;
  user_action?: string;
  [key: string]: unknown;
};

export function useTrackEvent() {
  const { user } = useAuth();

  const track = useCallback(async (eventType: string, eventData: EventData = {}) => {
    if (!user) {
      console.warn('[Analytics] Cannot track event - user not authenticated');
      return;
    }

    try {
      // Track in database using the function we created
      const { data, error } = await supabase.rpc('track_user_event', {
        p_event_type: eventType,
        p_event_data: eventData,
        p_page_url: window.location.href,
        p_session_id: crypto.randomUUID()
      });

      if (error) {
        console.error('[Analytics] Failed to track event:', error);
      } else {
        if (import.meta.env.DEV) console.log(`[Analytics] Tracked: ${eventType}`, { user_id: user.id, ...eventData });
      }

      return data;
    } catch (error) {
      console.error('[Analytics] Error tracking event:', error);
    }
  }, [user]);

  const trackButtonClick = useCallback((buttonName: string, destination: string, source = 'unknown') => {
    return track('button_click', {
      button_name: buttonName,
      destination,
      source,
      user_action: 'click'
    });
  }, [track]);

  const trackPageView = useCallback((pageName: string, additionalData: EventData = {}) => {
    return track('page_view', {
      page_name: pageName,
      ...additionalData
    });
  }, [track]);

  const trackFeatureUsage = useCallback((featureName: string, action: string, additionalData: EventData = {}) => {
    return track('feature_usage', {
      feature_name: featureName,
      action,
      ...additionalData
    });
  }, [track]);

  return {
    track,
    trackButtonClick,
    trackPageView,
    trackFeatureUsage
  };
}