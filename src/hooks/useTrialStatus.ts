import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { differenceInDays } from "date-fns";

export interface TrialStatus {
  loading: boolean;
  isOnTrial: boolean;
  daysRemaining: number | null;
  trialEndsAt: string | null;
  product: string | null;
  isExpired: boolean;
  isWarningPeriod: boolean; // ≤3 days remaining
  isUrgent: boolean; // ≤1 day remaining
}

export function useTrialStatus(): TrialStatus {
  const { user } = useAuth();
  const [status, setStatus] = useState<TrialStatus>({
    loading: true,
    isOnTrial: false,
    daysRemaining: null,
    trialEndsAt: null,
    product: null,
    isExpired: false,
    isWarningPeriod: false,
    isUrgent: false,
  });

  useEffect(() => {
    if (!user?.id) {
      setStatus({
        loading: false,
        isOnTrial: false,
        daysRemaining: null,
        trialEndsAt: null,
        product: null,
        isExpired: false,
        isWarningPeriod: false,
        isUrgent: false,
      });
      return;
    }

    const loadTrialStatus = async () => {
      try {
        setStatus((prev) => ({ ...prev, loading: true }));

        const { data, error } = await supabase
          .from("user_entitlements")
          .select("status, trial_ends_at, product")
          .eq("user_id", user.id)
          .eq("status", "trialing")
          .maybeSingle();

        if (error) {
          console.error("Trial status error:", error);
          throw error;
        }

        if (!data || !data.trial_ends_at) {
          // Not on trial
          setStatus({
            loading: false,
            isOnTrial: false,
            daysRemaining: null,
            trialEndsAt: null,
            product: null,
            isExpired: false,
            isWarningPeriod: false,
            isUrgent: false,
          });
          return;
        }

        const endDate = new Date(data.trial_ends_at);
        const today = new Date();
        const daysRemaining = differenceInDays(endDate, today);
        const isExpired = daysRemaining < 0;

        setStatus({
          loading: false,
          isOnTrial: !isExpired,
          daysRemaining: Math.max(0, daysRemaining),
          trialEndsAt: data.trial_ends_at,
          product: data.product,
          isExpired,
          isWarningPeriod: daysRemaining <= 3 && daysRemaining >= 0,
          isUrgent: daysRemaining <= 1 && daysRemaining >= 0,
        });
      } catch (error) {
        console.error("Failed to load trial status:", error);
        setStatus({
          loading: false,
          isOnTrial: false,
          daysRemaining: null,
          trialEndsAt: null,
          product: null,
          isExpired: false,
          isWarningPeriod: false,
          isUrgent: false,
        });
      }
    };

    loadTrialStatus();
  }, [user?.id]);

  return status;
}

