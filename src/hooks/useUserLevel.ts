import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type UserLevelData = {
  totalXP: number;
  level: number;
  tier: string;
  currentLevelXP: number;
  nextLevelXP: number;
  xpToNext: number;
  progress: number;
  stats: {
    validWorkouts: number;
    officeResets: number;
    totalDays: number;
    totalHabits: number;
    perfectHabitDays: number;
  };
};

// Global cache to prevent multiple API calls
const levelDataCache = new Map<string, { data: UserLevelData; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes background refresh

// Global state to prevent multiple simultaneous requests
let isFetching = false;
let fetchPromise: Promise<UserLevelData | null> | null = null;

export function useUserLevel() {
  const { user, session } = useAuth();
  const [levelData, setLevelData] = useState<UserLevelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousLevel, setPreviousLevel] = useState<number | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUserLevel = useCallback(async (forceRefresh = false): Promise<UserLevelData | null> => {
    if (!user) {
      setLoading(false);
      return null;
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = levelDataCache.get(user.id);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setLevelData(cached.data);
        setLoading(false);
        return cached.data;
      }
    }

    // Prevent multiple simultaneous requests
    if (isFetching && fetchPromise) {
      return fetchPromise;
    }

    isFetching = true;
    fetchPromise = (async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: functionError } = await supabase.functions.invoke('calculate-user-xp', {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        });

        if (functionError) {
          throw functionError;
        }

        // Check for level up
        if (levelData && data.level > levelData.level) {
          setPreviousLevel(levelData.level);
        }

        // Cache the result
        levelDataCache.set(user.id, { data, timestamp: Date.now() });
        
        setLevelData(data);
        return data;
      } catch (e) {
        console.error('Error fetching user level:', e);
        setError(e instanceof Error ? e.message : 'Failed to fetch user level');
        return null;
      } finally {
        setLoading(false);
        isFetching = false;
        fetchPromise = null;
      }
    })();

    return fetchPromise;
  }, [user, levelData]);

  // Initial load
  useEffect(() => {
    fetchUserLevel();
  }, [fetchUserLevel]);

  // Background refresh
  useEffect(() => {
    if (!user) return;

    // Set up background refresh
    refreshIntervalRef.current = setInterval(() => {
      fetchUserLevel(true); // Force refresh in background
    }, REFRESH_INTERVAL);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [user, fetchUserLevel]);

  const getTierColor = useCallback((tier: string): string => {
    switch (tier) {
      case 'Müütiline': return 'from-purple-500 to-pink-500';
      case 'Obsidian': return 'from-gray-800 to-gray-900';
      case 'Teemant': return 'from-blue-300 to-blue-500';
      case 'Plaatina': return 'from-gray-300 to-gray-500';
      case 'Kuld': return 'from-yellow-400 to-yellow-600';
      case 'Hõbe': return 'from-gray-200 to-gray-400';
      case 'Pronks': return 'from-orange-400 to-orange-600';
      default: return 'from-gray-300 to-gray-500';
    }
  }, []);

  const getTierIcon = useCallback((tier: string): string => {
    switch (tier) {
      case 'Müütiline': return '👑';
      case 'Obsidian': return '🖤';
      case 'Teemant': return '💎';
      case 'Plaatina': return '🥈';
      case 'Kuld': return '🥇';
      case 'Hõbe': return '🥈';
      case 'Pronks': return '🥉';
      default: return '🏅';
    }
  }, []);

  const clearLevelUpNotification = useCallback(() => {
    setPreviousLevel(null);
  }, []);

  const refreshLevel = useCallback(() => {
    fetchUserLevel(true);
  }, [fetchUserLevel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return {
    levelData,
    loading,
    error,
    previousLevel,
    hasLeveledUp: previousLevel !== null && levelData && levelData.level > previousLevel,
    getTierColor,
    getTierIcon,
    clearLevelUpNotification,
    refreshLevel,
  };
}