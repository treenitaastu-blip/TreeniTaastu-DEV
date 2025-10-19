import React, { createContext, useContext, ReactNode } from 'react';
import { useUserLevel } from '@/hooks/useUserLevel';

interface LevelSystemContextType {
  levelData: ReturnType<typeof useUserLevel>['levelData'];
  loading: boolean;
  error: string | null;
  previousLevel: number | null;
  hasLeveledUp: boolean;
  getTierColor: (tier: string) => string;
  getTierIcon: (tier: string) => string;
  clearLevelUpNotification: () => void;
  refreshLevel: () => void;
}

const LevelSystemContext = createContext<LevelSystemContextType | undefined>(undefined);

interface LevelSystemProviderProps {
  children: ReactNode;
}

export function LevelSystemProvider({ children }: LevelSystemProviderProps) {
  const levelSystem = useUserLevel();

  return (
    <LevelSystemContext.Provider value={levelSystem}>
      {children}
    </LevelSystemContext.Provider>
  );
}

export function useLevelSystem() {
  const context = useContext(LevelSystemContext);
  if (context === undefined) {
    throw new Error('useLevelSystem must be used within a LevelSystemProvider');
  }
  return context;
}
