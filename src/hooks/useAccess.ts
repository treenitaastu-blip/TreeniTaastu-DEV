import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type UseAccess = {
  loading: boolean;
  isAdmin: boolean;
  canStatic: boolean;
  canPT: boolean;
  reason: string | null;
  error?: string | null;
};

export default function useAccess(): UseAccess {
  const { user } = useAuth();
  
  // Check user access
  
  const [state, setState] = useState<UseAccess>({
    loading: true,
    isAdmin: false,
    canStatic: false,
    canPT: false,
    reason: null,
  });

  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!user) {
        if (!alive) return;
        setState({
          loading: false,
          isAdmin: false,
          canStatic: false,
          canPT: false,
          reason: "anon",
        });
        return;
      }

      try {
        // Use unified admin check function
        const { data: isAdminData, error: adminErr } = await supabase.rpc('is_admin_unified');
        
        let isAdmin = false;
        
        if (adminErr) {
          console.error("Admin check error:", adminErr);
          // Fallback to profile check if RPC fails
          const { data: prof, error: profErr } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle<{ role: string | null }>();

          if (profErr) {
            console.error("Profile access error:", profErr);
            throw profErr;
          }

          isAdmin = (prof?.role ?? null) === "admin";
        } else {
          isAdmin = isAdminData || false;
        }

        // If admin, grant all access immediately
        if (isAdmin) {
          if (alive) {
            setState({
              loading: false,
              isAdmin: true,
              canStatic: true,
              canPT: true,
              reason: "admin",
            });
          }
          return;
        }

        // For non-admins, check entitlements directly
        const { data: entitlements, error: entErr } = await supabase
          .from("user_entitlements")
          .select("product, status, trial_ends_at, expires_at, paused")
          .eq("user_id", user.id)
          .in("status", ["active", "trialing"]);
        
        if (entErr) {
          console.warn("Entitlements access error:", entErr);
          // Don't fail completely, just set no access
          if (alive) {
            setState({
              loading: false,
              isAdmin: false,
              canStatic: false,
              canPT: false,
              reason: "entitlements-error",
            });
          }
          return;
        }

        // Check for active entitlements
        // STATIC access is ONLY granted to:
        // 1. Monthly subscriptions: product = "static" with status "active" (self_guided or guided)
        // 2. Trial users: product = "static" with status "trialing"
        // 3. Transformation package: product = "static" with source "stripe_transformation" (1 year access)
        // 
        // IMPORTANT: One-time PT purchases do NOT grant static access
        const now = new Date();
        
        // Static access: Only from static product (monthly subscriptions, trials, or transformation)
        const hasActiveStatic = entitlements?.some(e => 
          e.product === "static" && 
          !e.paused &&
          (
            // Monthly subscription or transformation (active status, not expired)
            (e.status === "active" && (e.expires_at === null || new Date(e.expires_at) > now)) ||
            // Free trial (trialing status, trial not ended)
            (e.status === "trialing" && e.trial_ends_at && new Date(e.trial_ends_at) > now)
          )
        ) ?? false;
        
        // PT access: Can be from monthly subscription (guided) or one-time purchase
        // PT access does NOT grant static access unless part of monthly subscription
        const hasActivePT = entitlements?.some(e => 
          e.product === "pt" && 
          !e.paused && 
          (
            (e.status === "active" && (e.expires_at === null || new Date(e.expires_at) > now)) ||
            (e.status === "trialing" && e.trial_ends_at && new Date(e.trial_ends_at) > now)
          )
        ) ?? false;

        if (alive) {
          setState({
            loading: false,
            isAdmin: false,
            canStatic: hasActiveStatic,
            canPT: hasActivePT,
            reason: "direct-entitlements",
          });
        }

      } catch (e) {
        console.error("[useAccess] Error:", e);
        if (alive) {
          setState({
            loading: false,
            isAdmin: false,
            canStatic: false,
            canPT: false,
            reason: "error",
            error: e instanceof Error ? e.message : "Unknown error",
          });
        }
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [user?.id]); // refetch on login change

  return state;
}