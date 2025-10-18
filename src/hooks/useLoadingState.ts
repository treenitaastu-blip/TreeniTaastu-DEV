import { useState, useCallback } from 'react';

export interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
  progress?: number;
  error?: string;
}

export interface LoadingStateManager {
  loadingStates: Record<string, LoadingState>;
  setLoading: (key: string, isLoading: boolean, message?: string, progress?: number) => void;
  setError: (key: string, error: string) => void;
  clearError: (key: string) => void;
  clearAll: () => void;
  isAnyLoading: boolean;
  getLoadingState: (key: string) => LoadingState;
}

export function useLoadingState(): LoadingStateManager {
  const [loadingStates, setLoadingStates] = useState<Record<string, LoadingState>>({});

  const setLoading = useCallback((key: string, isLoading: boolean, message?: string, progress?: number) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        isLoading,
        loadingMessage: message,
        progress,
        error: undefined
      }
    }));
  }, []);

  const setError = useCallback((key: string, error: string) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isLoading: false,
        error
      }
    }));
  }, []);

  const clearError = useCallback((key: string) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        error: undefined
      }
    }));
  }, []);

  const clearAll = useCallback(() => {
    setLoadingStates({});
  }, []);

  const isAnyLoading = Object.values(loadingStates).some(state => state.isLoading);

  const getLoadingState = useCallback((key: string): LoadingState => {
    return loadingStates[key] || { isLoading: false };
  }, [loadingStates]);

  return {
    loadingStates,
    setLoading,
    setError,
    clearError,
    clearAll,
    isAnyLoading,
    getLoadingState
  };
}

// Hook for managing a single loading state
export function useSingleLoadingState(initialState: LoadingState = { isLoading: false }) {
  const [loadingState, setLoadingState] = useState<LoadingState>(initialState);

  const setLoading = useCallback((isLoading: boolean, message?: string, progress?: number) => {
    setLoadingState({
      isLoading,
      loadingMessage: message,
      progress,
      error: undefined
    });
  }, []);

  const setError = useCallback((error: string) => {
    setLoadingState(prev => ({
      ...prev,
      isLoading: false,
      error
    }));
  }, []);

  const clearError = useCallback(() => {
    setLoadingState(prev => ({
      ...prev,
      error: undefined
    }));
  }, []);

  const clear = useCallback(() => {
    setLoadingState({ isLoading: false });
  }, []);

  return {
    loadingState,
    setLoading,
    setError,
    clearError,
    clear,
    isLoading: loadingState.isLoading,
    loadingMessage: loadingState.loadingMessage,
    progress: loadingState.progress,
    error: loadingState.error
  };
}

// Common loading state keys
export const LOADING_KEYS = {
  // Workout related
  WORKOUT_START: 'workout_start',
  WORKOUT_SAVE: 'workout_save',
  WORKOUT_COMPLETE: 'workout_complete',
  EXERCISE_SAVE: 'exercise_save',
  SET_COMPLETE: 'set_complete',
  RPE_SAVE: 'rpe_save',
  
  // Program related
  PROGRAM_LOAD: 'program_load',
  PROGRAM_ASSIGN: 'program_assign',
  PROGRAM_DELETE: 'program_delete',
  PROGRAM_UPDATE: 'program_update',
  
  // Template related
  TEMPLATE_LOAD: 'template_load',
  TEMPLATE_CREATE: 'template_create',
  TEMPLATE_UPDATE: 'template_update',
  TEMPLATE_DELETE: 'template_delete',
  
  // User related
  USER_LOAD: 'user_load',
  USER_UPDATE: 'user_update',
  
  // Analytics related
  ANALYTICS_LOAD: 'analytics_load',
  PROGRESSION_ANALYSIS: 'progression_analysis',
  
  // General
  DATA_LOAD: 'data_load',
  DATA_SAVE: 'data_save',
  DATA_DELETE: 'data_delete'
} as const;

// Loading messages in Estonian
export const LOADING_MESSAGES = {
  [LOADING_KEYS.WORKOUT_START]: 'Treeningu alustamine...',
  [LOADING_KEYS.WORKOUT_SAVE]: 'Treeningu salvestamine...',
  [LOADING_KEYS.WORKOUT_COMPLETE]: 'Treeningu lõpetamine...',
  [LOADING_KEYS.EXERCISE_SAVE]: 'Harjutuse salvestamine...',
  [LOADING_KEYS.SET_COMPLETE]: 'Setti märkimine...',
  [LOADING_KEYS.RPE_SAVE]: 'RPE hinnangu salvestamine...',
  [LOADING_KEYS.PROGRAM_LOAD]: 'Programmi laadimine...',
  [LOADING_KEYS.PROGRAM_ASSIGN]: 'Programmi määramine...',
  [LOADING_KEYS.PROGRAM_DELETE]: 'Programmi kustutamine...',
  [LOADING_KEYS.PROGRAM_UPDATE]: 'Programmi uuendamine...',
  [LOADING_KEYS.TEMPLATE_LOAD]: 'Malli laadimine...',
  [LOADING_KEYS.TEMPLATE_CREATE]: 'Malli loomine...',
  [LOADING_KEYS.TEMPLATE_UPDATE]: 'Malli uuendamine...',
  [LOADING_KEYS.TEMPLATE_DELETE]: 'Malli kustutamine...',
  [LOADING_KEYS.USER_LOAD]: 'Kasutaja andmete laadimine...',
  [LOADING_KEYS.USER_UPDATE]: 'Kasutaja andmete uuendamine...',
  [LOADING_KEYS.ANALYTICS_LOAD]: 'Analüütika laadimine...',
  [LOADING_KEYS.PROGRESSION_ANALYSIS]: 'Progressiooni analüüs...',
  [LOADING_KEYS.DATA_LOAD]: 'Andmete laadimine...',
  [LOADING_KEYS.DATA_SAVE]: 'Andmete salvestamine...',
  [LOADING_KEYS.DATA_DELETE]: 'Andmete kustutamine...'
} as const;

// Function to get loading message
export function getLoadingMessage(key: string): string {
  return LOADING_MESSAGES[key as keyof typeof LOADING_MESSAGES] || 'Laadimine...';
}
