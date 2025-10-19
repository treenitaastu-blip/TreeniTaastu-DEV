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
    
    // Fast timeout for better UX
    const timeoutId = setTimeout(() => {
      if (aliveRef.current) {
        setLoading(false);
        setLoadingEntitlement(false);
        setStatus("signedOut");
        setEntitlement({ isSubscriber: false });
      }
    }, 2000); // 2 second timeout

    (async () => {
      setLoading(true);

      try {
        const {
          data: { session: sess },
        } = await supabase.auth.getSession();

        clearTimeout(timeoutId);

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