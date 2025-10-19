// src/integrations/supabase/client.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// SECURITY: Only use environment variables - no hardcoded credentials
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
      storageKey: "treenitaastu_main_auth",
    },
  });

if (!globalForSupabase.__supabase) {
  globalForSupabase.__supabase = supabase;
}

// Optional: default export for flexibility (doesn't break named import usage)
export default supabase;
