// src/providers/AuthProvider.tsx
import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthStatus = "loading" | "signedOut" | "signedIn";

export type Entitlement = {
  isSubscriber: boolean;
  raw?: unknown;
};

export type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: Record<string, unknown> | null;
  entitlement: Entitlement | null;
  loading: boolean;
  loadingEntitlement: boolean;
  error: unknown;
  refreshEntitlements: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue>({
  status: "loading",
  session: null,
  user: null,
  profile: null,
  entitlement: null,
  loading: true,
  loadingEntitlement: true,
  error: null,
  refreshEntitlements: async () => {},
  signOut: async () => {},
});


export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Detect preview mode (exclude localhost for development)
  const isPreviewMode = typeof window !== 'undefined' && (
    window.location.hostname.includes('lovableproject.com') ||
    window.location.search.includes('__lovable_token') ||
    window.location.hostname.includes('vercel.app')
  );

  const [status, setStatus] = useState<AuthStatus>(isPreviewMode ? "signedOut" : "loading");
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [loading, setLoading] = useState<boolean>(!isPreviewMode);
  const [loadingEntitlement, setLoadingEntitlement] = useState<boolean>(!isPreviewMode);
  const [error, setError] = useState<unknown>(null);

  const aliveRef = useRef(true);
  useEffect(() => {
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const fetchingRef = useRef(false);
  const lastFetchAtRef = useRef<number | null>(null);

  const refreshEntitlements = useCallback(async () => {
    if (!user) return;

    const now = Date.now();
    if (fetchingRef.current) return;
    if (lastFetchAtRef.current && now - lastFetchAtRef.current < 2000) return;
    fetchingRef.current = true;
    lastFetchAtRef.current = now;

    setLoadingEntitlement(true);
    setError(null);

    try {
      // Try simple profile fetch first
      const profRes = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (!aliveRef.current) return;
      
      setProfile((profRes.data as Record<string, unknown>) ?? null);
      
      // Set a basic entitlement - we'll handle detailed access via useAccess hook
      setEntitlement({
        isSubscriber: false
      });
      
    } catch (e) {
      console.error("[AuthProvider] entitlement/profile error:", e);
      if (aliveRef.current) {
        setError(e);
        // Don't fail completely, set basic entitlement
        setEntitlement({
          isSubscriber: false
        });
      }
    } finally {
      if (aliveRef.current) setLoadingEntitlement(false);
      fetchingRef.current = false;
    }
  }, [user]);

  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    // Skip auth initialization in preview mode
    if (isPreviewMode) {
      console.log("[AuthProvider] Preview mode detected, skipping auth");
      setLoading(false);
      setLoadingEntitlement(false);
      setStatus("signedOut");
      setEntitlement({ isSubscriber: false });
      return;
    }

    let unsub: (() => void) | null = null;
    
    // Shorter timeout for non-preview mode
    const timeoutId = setTimeout(() => {
      console.warn("[AuthProvider] Auth initialization timeout, forcing loading to false");
      if (aliveRef.current) {
        setLoading(false);
        setLoadingEntitlement(false);
        setStatus("signedOut");
        setError(new Error("Auth initialization timeout"));
        setEntitlement({ isSubscriber: false });
      }
    }, 3000); // 3 second timeout for faster preview

    (async () => {
      setLoading(true);

      try {
        const {
          data: { session: sess },
        } = await supabase.auth.getSession();

        clearTimeout(timeoutId); // Clear timeout on success

        if (!aliveRef.current) {
          return;
        }

        setSession(sess ?? null);
        setUser(sess?.user ?? null);
        setStatus(sess ? "signedIn" : "signedOut");
        setLoading(false);

        if (sess?.user) {
          refreshEntitlements();
        }
      } catch (error) {
        console.error("[AuthProvider] Auth initialization error:", error);
        clearTimeout(timeoutId); // Clear timeout on error
        if (aliveRef.current) {
          setLoading(false);
          setLoadingEntitlement(false);
          setStatus("signedOut");
          setError(error);
          setEntitlement({ isSubscriber: false });
        }
      }

      const sub = supabase.auth.onAuthStateChange((event, newSession) => {
        if (!aliveRef.current) return;

        setSession(newSession ?? null);
        setUser(newSession?.user ?? null);
        setStatus(newSession ? "signedIn" : "signedOut");

        if (newSession && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
          // ⚠️ keep old entitlement until refreshed (no reset flicker)
          refreshEntitlements();
        }
        if (event === "SIGNED_OUT") {
          setProfile(null);
          setEntitlement(null);
        }
      });

      unsub = () => sub.data.subscription.unsubscribe();
    })();

    return () => {
      clearTimeout(timeoutId); // Clean up timeout
      try {
        unsub?.();
      } catch {
        // ignore
      }
    };
  }, [refreshEntitlements, isPreviewMode]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    if (!aliveRef.current) return;
    setSession(null);
    setUser(null);
    setProfile(null);
    setEntitlement(null);
    setStatus("signedOut");
    // Redirect to landing page after sign out
    window.location.href = '/';
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user,
      profile,
      entitlement,
      loading,
      loadingEntitlement,
      error,
      refreshEntitlements,
      signOut,
    }),
    [
      status,
      session,
      user,
      profile,
      entitlement,
      loading,
      loadingEntitlement,
      error,
      refreshEntitlements,
      signOut,
    ]
  );

  // ⚠️ Don’t render children until first bootstrap done
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading…
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
