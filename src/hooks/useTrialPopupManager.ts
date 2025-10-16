import { useEffect, useState, useCallback } from "react";
import { useTrialStatus } from "./useTrialStatus";

interface TrialPopupState {
  lastShown: number | null;
  showCount: number;
  userDismissed: boolean;
  nextShowTime: number | null;
  dismissalReason: string | null;
  lastActivity: number;
}

interface TrialPopupManager {
  shouldShow: boolean;
  canShow: boolean;
  showPopup: () => void;
  dismissPopup: (reason: 'remind_tomorrow' | 'dont_show_again' | 'upgrade_later' | 'close') => void;
  isFirstShow: boolean;
  timeUntilNextShow: number | null;
}

const STORAGE_KEY = 'trial_popup_state';
const SHOW_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
const ACTIVITY_THRESHOLD = 2 * 60 * 1000; // 2 minutes of activity before showing

export function useTrialPopupManager(): TrialPopupManager {
  const trialStatus = useTrialStatus();
  const [state, setState] = useState<TrialPopupState>({
    lastShown: null,
    showCount: 0,
    userDismissed: false,
    nextShowTime: null,
    dismissalReason: null,
    lastActivity: Date.now(),
  });

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setState(parsed);
      }
    } catch (error) {
      console.error('Failed to load trial popup state:', error);
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save trial popup state:', error);
    }
  }, [state]);

  // Track user activity
  useEffect(() => {
    const updateActivity = () => {
      setState(prev => ({ ...prev, lastActivity: Date.now() }));
    };

    // Track various user activities
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, []);

  // Check if we should show the popup
  const shouldShow = useCallback(() => {
    // Don't show if trial status is loading
    if (trialStatus.loading) return false;

    // Don't show if not on trial or in grace period
    if (!trialStatus.isOnTrial && !trialStatus.isInGracePeriod) return false;

    // Don't show if user dismissed with "don't show again"
    if (state.userDismissed && state.dismissalReason === 'dont_show_again') return false;

    // Don't show if dismissed with "remind tomorrow" and it's still the same day
    if (state.userDismissed && state.dismissalReason === 'remind_tomorrow') {
      const today = new Date().toDateString();
      const lastDismissalDate = state.lastShown ? new Date(state.lastShown).toDateString() : null;
      if (lastDismissalDate === today) return false;
    }

    // Don't show if dismissed with "upgrade later" and it's been less than 2 hours
    if (state.userDismissed && state.dismissalReason === 'upgrade_later') {
      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
      if (state.lastShown && state.lastShown > twoHoursAgo) return false;
    }

    // Don't show if we're waiting for the next show time
    if (state.nextShowTime && Date.now() < state.nextShowTime) return false;

    // Don't show if user is actively using the app (recent activity)
    const timeSinceActivity = Date.now() - state.lastActivity;
    if (timeSinceActivity < ACTIVITY_THRESHOLD) return false;

    return true;
  }, [trialStatus, state]);

  // Check if we can show (not actively being shown)
  const canShow = shouldShow() && !state.userDismissed;

  const showPopup = useCallback(() => {
    const now = Date.now();
    setState(prev => ({
      ...prev,
      lastShown: now,
      showCount: prev.showCount + 1,
      userDismissed: false,
      nextShowTime: now + SHOW_INTERVAL,
    }));
  }, []);

  const dismissPopup = useCallback((reason: 'remind_tomorrow' | 'dont_show_again' | 'upgrade_later' | 'close') => {
    const now = Date.now();
    let nextShowTime: number | null = null;

    switch (reason) {
      case 'remind_tomorrow':
        // Show again tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0); // 9 AM tomorrow
        nextShowTime = tomorrow.getTime();
        break;
      case 'upgrade_later':
        // Show again in 2 hours
        nextShowTime = now + (2 * 60 * 60 * 1000);
        break;
      case 'dont_show_again':
        // Don't show again until trial status changes
        nextShowTime = null;
        break;
      case 'close':
        // Show again in 5 minutes
        nextShowTime = now + SHOW_INTERVAL;
        break;
    }

    setState(prev => ({
      ...prev,
      userDismissed: true,
      dismissalReason: reason,
      nextShowTime,
    }));
  }, []);

  // Reset dismissal state when trial status changes
  useEffect(() => {
    if (trialStatus.isOnTrial !== state.isOnTrial || trialStatus.isInGracePeriod !== state.isInGracePeriod) {
      setState(prev => ({
        ...prev,
        userDismissed: false,
        dismissalReason: null,
        nextShowTime: null,
      }));
    }
  }, [trialStatus.isOnTrial, trialStatus.isInGracePeriod]);

  const isFirstShow = state.showCount === 0;
  const timeUntilNextShow = state.nextShowTime ? Math.max(0, state.nextShowTime - Date.now()) : null;

  return {
    shouldShow: shouldShow(),
    canShow,
    showPopup,
    dismissPopup,
    isFirstShow,
    timeUntilNextShow,
  };
}

