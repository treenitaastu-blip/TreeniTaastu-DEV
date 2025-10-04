// src/integrations/supabase/client.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Prefer env vars (local/dev/prod) but fall back to hardcoded defaults for development
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://dtxbrnrpzepwoxooqwlj.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0eGJybnJwemVwd294b29xd2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzOTgzODgsImV4cCI6MjA3NDk3NDM4OH0.HEYeT-qEv0AsJ5-zh15xTwtr0V1soQ_3Hp4fzmRnryA";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase configuration: URL and/or Anon Key");
}

/**
 * Singleton to avoid multiple GoTrue clients during HMR,
 * plus a custom storageKey to prevent clashes across previews/projects.
 */
type DBClient = SupabaseClient<Database>;
const globalForSupabase = globalThis as unknown as { __supabase?: DBClient };

export const supabase: DBClient =
  globalForSupabase.__supabase ??
  createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
