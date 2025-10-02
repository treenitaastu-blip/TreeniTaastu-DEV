// Optimized auth hook with memoization and performance improvements
import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import useAccess from "@/hooks/useAccess";

export interface OptimizedAuthState {
  // Auth state
  user: any;
  session: any;
  loading: boolean;
  
  // Access state  
  isAdmin: boolean;
  canStatic: boolean;
  canPT: boolean;
  accessLoading: boolean;
  
  // Computed states
  isAuthenticated: boolean;
  hasAnyAccess: boolean;
  needsUpgrade: boolean;
}

export function useOptimizedAuth(): OptimizedAuthState {
  const { user, session, loading: authLoading } = useAuth();
  const { loading: accessLoading, isAdmin, canStatic, canPT } = useAccess();

  // Memoize computed values to prevent unnecessary re-renders
  const computedState = useMemo((): OptimizedAuthState => {
    const isAuthenticated = !!user;
    const loading = authLoading || accessLoading;
    const hasAnyAccess = isAdmin || canStatic || canPT;
    const needsUpgrade = isAuthenticated && !hasAnyAccess;

    return {
      user,
      session,
      loading,
      isAdmin,
      canStatic,
      canPT,
      accessLoading,
      isAuthenticated,
      hasAnyAccess,
      needsUpgrade
    };
  }, [user, session, authLoading, accessLoading, isAdmin, canStatic, canPT]);

  return computedState;
}