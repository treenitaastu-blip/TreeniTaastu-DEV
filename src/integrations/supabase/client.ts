// src/integrations/supabase/client.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// SECURITY: Only use environment variables - no hardcoded credentials
// For localhost development, allow fallback values if env vars aren't loaded
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Temporary fallback for localhost development only (if env vars not loaded by Vite)
const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const finalUrl = SUPABASE_URL || (isLocalhost ? 'https://dtxbrnrpzepwoxooqwlj.supabase.co' : null);
const finalKey = SUPABASE_ANON_KEY || (isLocalhost ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0eGJybnJwemVwd294b29xd2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzOTgzODgsImV4cCI6MjA3NDk3NDM4OH0.HEYeT-qEv0AsJ5-zh15xTwtr0V1soQ_3Hp4fzmRnryA' : null);

const PASSWORD_RECOVERY_STORAGE_KEY = "treenitaastu_password_recovery";
const PASSWORD_RECOVERY_MAX_AGE_MS = 15 * 60 * 1000;

type PasswordRecoveryProof = {
  accessToken: string;
  createdAt: number;
};

export const storePasswordRecoveryProof = (accessToken: string) => {
  if (typeof window === "undefined" || !accessToken) return;
  const proof: PasswordRecoveryProof = { accessToken, createdAt: Date.now() };
  window.sessionStorage.setItem(PASSWORD_RECOVERY_STORAGE_KEY, JSON.stringify(proof));
};

// Capture the proof before Supabase removes recovery parameters from the URL.
if (typeof window !== "undefined") {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  if (hash.get("type") === "recovery" && hash.get("access_token")) {
    storePasswordRecoveryProof(hash.get("access_token")!);
  }
}

if (!finalUrl || !finalKey) {
  console.error("[Supabase Client] Missing configuration:", {
    hasUrl: !!SUPABASE_URL,
    hasKey: !!SUPABASE_ANON_KEY,
    usingFallback: isLocalhost && (!SUPABASE_URL || !SUPABASE_ANON_KEY),
    envKeys: Object.keys(import.meta.env).filter(k => k.startsWith('VITE_'))
  });
  throw new Error("Missing Supabase configuration: URL and/or Anon Key");
}

if (isLocalhost && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
  console.warn("[Supabase Client] Using fallback credentials for localhost development. Make sure .env.local is loaded.");
}

/**
 * Singleton to avoid multiple GoTrue clients during HMR,
 * plus a custom storageKey to prevent clashes across previews/projects.
 */
type DBClient = SupabaseClient<Database>;
const globalForSupabase = globalThis as unknown as { __supabase?: DBClient };

export const supabase: DBClient =
  globalForSupabase.__supabase ??
  createClient<Database>(finalUrl, finalKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "treenitaastu_auth",
    },
  });

if (!globalForSupabase.__supabase) {
  globalForSupabase.__supabase = supabase;
}

// Keep a short-lived marker that distinguishes a recovery session from a
// normal signed-in session. This prevents /reset-password from becoming an
// alternative password-change route for already authenticated users.
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY" && session?.access_token) {
    storePasswordRecoveryProof(session.access_token);
  }
  if (event === "SIGNED_OUT" && typeof window !== "undefined") {
    window.sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
  }
});

export const hasPasswordRecoveryProof = (accessToken?: string | null) => {
  if (typeof window === "undefined" || !accessToken) return false;

  try {
    const raw = window.sessionStorage.getItem(PASSWORD_RECOVERY_STORAGE_KEY);
    if (!raw) return false;

    const proof = JSON.parse(raw) as PasswordRecoveryProof;
    const isFresh = Date.now() - proof.createdAt <= PASSWORD_RECOVERY_MAX_AGE_MS;
    if (!isFresh) {
      window.sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
      return false;
    }

    return proof.accessToken === accessToken;
  } catch {
    window.sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
    return false;
  }
};

export const clearPasswordRecoveryProof = () => {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
  }
};

// Optional: default export for flexibility (doesn't break named import usage)
export default supabase;
