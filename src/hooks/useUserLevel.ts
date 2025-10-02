import { useState, useEffect } from 'react';
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

export function useUserLevel() {
  const { user } = useAuth();
  const [levelData, setLevelData] = useState<UserLevelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousLevel, setPreviousLevel] = useState<number | null>(null);

  const fetchUserLevel = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: functionError } = await supabase.functions.invoke('calculate-user-xp', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (functionError) {
        throw functionError;
      }

      // Check for level up
      if (levelData && data.level > levelData.level) {
        setPreviousLevel(levelData.level);
      }

      setLevelData(data);
    } catch (e) {
      console.error('Error fetching user level:', e);
      setError(e instanceof Error ? e.message : 'Failed to fetch user level');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserLevel();
  }, [user]);

  const getTierColor = (tier: string): string => {
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
  };

  const getTierIcon = (tier: string): string => {
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
  };

  const clearLevelUpNotification = () => {
    setPreviousLevel(null);
  };

  return {
    levelData,
    loading,
    error,
    previousLevel,
    hasLeveledUp: previousLevel !== null && levelData && levelData.level > previousLevel,
    getTierColor,
    getTierIcon,
    clearLevelUpNotification,
    refreshLevel: fetchUserLevel,
  };
}