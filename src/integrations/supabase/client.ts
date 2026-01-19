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

// Optional: default export for flexibility (doesn't break named import usage)
export default supabase;
