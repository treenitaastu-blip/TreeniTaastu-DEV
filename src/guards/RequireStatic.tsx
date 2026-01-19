import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import useAccess from "@/hooks/useAccess";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function RequireStatic() {
  const loc = useLocation();
  const { status, user } = useAuth();
  const { loading, canStatic, isAdmin } = useAccess();
  const trialStatus = useTrialStatus();
  const [hasActiveProgram, setHasActiveProgram] = useState<boolean | null>(null);
  const [checkingProgram, setCheckingProgram] = useState(true);

  // Check if user has an active static program (allows access even without subscription)
  useEffect(() => {
    if (!user) {
      setHasActiveProgram(false);
      setCheckingProgram(false);
      return;
    }

    const checkActiveProgram = async () => {
      try {
        // Check if user has an active static program in user_programs
        const { data, error } = await supabase
          .from('user_programs')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        setHasActiveProgram(!!data && !error);
      } catch (err) {
        console.error('Error checking active program:', err);
        setHasActiveProgram(false);
      } finally {
        setCheckingProgram(false);
      }
    };

    checkActiveProgram();
  }, [user]);

  // Still resolving auth or access
  if (status === "loading" || loading || trialStatus.loading || checkingProgram) {
    return (
      <div className="min-h-[40vh] grid place-items-center p-6 text-sm text-muted-foreground">
        Kontrollin ligipääsu…
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return <Navigate to="/login" state={{ from: loc }} replace />;
  }

  // Check if trial has expired AND grace period has ended (redirect to trial-expired page)
  if (trialStatus.isExpired && !trialStatus.isInGracePeriod && !canStatic && !isAdmin) {
    return <Navigate to="/trial-expired" replace />;
  }

  // Allow access during grace period (even if expired)
  if (trialStatus.isInGracePeriod && !isAdmin) {
    // Grace period users get read-only access, banner will prompt upgrade
    return <Outlet />;
  }

  // Allow access if:
  // 1. User has static subscription (canStatic)
  // 2. User is admin (isAdmin)
  // 3. User has an active static program (hasActiveProgram)
  // This allows users who started a program to access it even without subscription
  if (!canStatic && !isAdmin && !hasActiveProgram) {
    return <Navigate to="/pricing" replace />;
  }

  return <Outlet />;
}
