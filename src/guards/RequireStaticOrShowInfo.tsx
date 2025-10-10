import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import useAccess from "@/hooks/useAccess";
import { useTrialStatus } from "@/hooks/useTrialStatus";

export default function RequireStaticOrShowInfo() {
  const loc = useLocation();
  const { status, user } = useAuth();
  const { loading, canStatic, isAdmin } = useAccess();
  const trialStatus = useTrialStatus();

  // Still resolving auth or access
  if (status === "loading" || loading || trialStatus.loading) {
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

  // Signed in but no Static access - redirect to program info instead of pricing (admins always have access)
  if (!canStatic && !isAdmin) {
    return <Navigate to="/programm-info" replace />;
  }

  return <Outlet />;
}