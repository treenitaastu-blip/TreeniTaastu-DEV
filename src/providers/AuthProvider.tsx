// src/providers/AuthProviderFixed.tsx
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
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingEntitlement, setLoadingEntitlement] = useState<boolean>(true);
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
      const profRes = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (!aliveRef.current) return;
      
      setProfile((profRes.data as Record<string, unknown>) ?? null);
      
      setEntitlement({
        isSubscriber: false
      });
      
    } catch (e) {
      console.error("Profile/entitlement error:", e);
      if (aliveRef.current) {
        setError(e);
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

    // Initialize authentication

    let unsub: (() => void) | null = null;
    
    // Immediate fallback: Set loading to false after 300ms no matter what
    // FIX: Always call setState - don't check aliveRef (was blocking updates during remounts)
    const immediateTimeout = setTimeout(() => {
      // Always call setState - React safely ignores if component unmounted
      setLoading(false);
      setLoadingEntitlement(false);
      setStatus("signedOut");
      setEntitlement({ isSubscriber: false });
    }, 300); // 300ms timeout - very fast
    
    // Backup timeout for safety
    const timeoutId = setTimeout(() => {
      clearTimeout(immediateTimeout);
      // Always call setState - React safely ignores if component unmounted
      setLoading(false);
      setLoadingEntitlement(false);
      setStatus("signedOut");
      setEntitlement({ isSubscriber: false });
    }, 1000); // 1 second timeout

    (async () => {
      setLoading(true);

      try {
        // Add timeout wrapper to prevent hanging
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) => {
          setTimeout(() => resolve({ data: { session: null } }), 1000);
        });

        const result = await Promise.race([sessionPromise, timeoutPromise]);
        clearTimeout(timeoutId);
        clearTimeout(immediateTimeout);

        if (!aliveRef.current) {
          return;
        }

        const {
          data: { session: sess },
        } = result;

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
        console.error("Auth initialization error:", error);
        clearTimeout(timeoutId);
        clearTimeout(immediateTimeout);
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
      clearTimeout(timeoutId);
      clearTimeout(immediateTimeout);
      try {
        unsub?.();
      } catch {
        // ignore
      }
    };
  }, [refreshEntitlements]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    if (!aliveRef.current) return;
    setSession(null);
    setUser(null);
    setProfile(null);
    setEntitlement(null);
    setStatus("signedOut");
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

  // Don't render children until first bootstrap done
  // But add a maximum timeout to prevent infinite loading - force render after 2s
  // FIX: Always call setLoading even if component unmounts (React will handle it safely)
  useEffect(() => {
    const maxTimeout = setTimeout(() => {
      // FIX: Always call setState - React safely ignores if component unmounted
      // The aliveRef check was preventing state updates during remounts
      setLoading(false);
      setLoadingEntitlement(false);
      setStatus("signedOut");
      setEntitlement({ isSubscriber: false });
    }, 2000); // Absolute maximum 2 seconds
    
    return () => clearTimeout(maxTimeout);
  }, []); // Only run once on mount, not when loading changes

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <div>Loading…</div>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}