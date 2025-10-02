import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isPreviewMode, getPreviewAccess } from "@/utils/preview";

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
  
  // Return preview access immediately if in preview mode
  if (isPreviewMode()) {
    return getPreviewAccess();
  }
  
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
        // Simplified approach - check profile for admin first
        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle<{ role: string | null }>();

        if (profErr) {
          console.error("Profile access error:", profErr);
          throw profErr;
        }

        const isAdmin = (prof?.role ?? null) === "admin";

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

        // Check for active entitlements - Static program only for PAID users (not trial)
        const now = new Date();
        const hasActiveStatic = entitlements?.some(e => 
          e.product === "static" && 
          !e.paused && 
          e.status === "active" && // Only active subscribers, not trial users
          (e.expires_at === null || new Date(e.expires_at) > now) // Check expiry for yearly payments
        ) ?? false;
        
        const hasActivePT = entitlements?.some(e => 
          e.product === "pt" && 
          !e.paused && 
          (e.status === "active" || 
            (e.status === "trialing" && e.trial_ends_at && new Date(e.trial_ends_at) > now))
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