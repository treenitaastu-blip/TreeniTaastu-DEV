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
  isInGracePeriod: boolean; // Expired but within 48h grace period
  gracePeriodEndsAt: string | null; // When grace period ends
  hoursRemainingInGrace: number | null; // Hours left in grace period
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
    isInGracePeriod: false,
    gracePeriodEndsAt: null,
    hoursRemainingInGrace: null,
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
        isInGracePeriod: false,
        gracePeriodEndsAt: null,
        hoursRemainingInGrace: null,
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
            isInGracePeriod: false,
            gracePeriodEndsAt: null,
            hoursRemainingInGrace: null,
          });
          return;
        }

        const endDate = new Date(data.trial_ends_at);
        const today = new Date();
        const daysRemaining = differenceInDays(endDate, today);
        const isExpired = daysRemaining < 0;
        
        // Grace period: 48 hours after trial ends
        const GRACE_PERIOD_HOURS = 48;
        const gracePeriodEnd = new Date(endDate.getTime() + GRACE_PERIOD_HOURS * 60 * 60 * 1000);
        const isInGracePeriod = isExpired && today < gracePeriodEnd;
        const hoursRemainingInGrace = isInGracePeriod 
          ? Math.max(0, Math.floor((gracePeriodEnd.getTime() - today.getTime()) / (1000 * 60 * 60)))
          : null;

        setStatus({
          loading: false,
          isOnTrial: !isExpired,
          daysRemaining: Math.max(0, daysRemaining),
          trialEndsAt: data.trial_ends_at,
          product: data.product,
          isExpired,
          isWarningPeriod: daysRemaining <= 3 && daysRemaining >= 0,
          isUrgent: daysRemaining <= 1 && daysRemaining >= 0,
          isInGracePeriod,
          gracePeriodEndsAt: gracePeriodEnd.toISOString(),
          hoursRemainingInGrace,
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
          isInGracePeriod: false,
          gracePeriodEndsAt: null,
          hoursRemainingInGrace: null,
        });
      }
    };

    loadTrialStatus();
  }, [user?.id]);

  return status;
}

