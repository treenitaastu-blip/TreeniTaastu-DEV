import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import useAccess from "@/hooks/useAccess";

export default function RequireStaticOrShowInfo() {
  const loc = useLocation();
  const { status, user } = useAuth();
  const { loading, canStatic, isAdmin } = useAccess();

  // Still resolving auth or access
  if (status === "loading" || loading) {
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

  // Signed in but no Static access - redirect to program info instead of pricing (admins always have access)
  if (!canStatic && !isAdmin) {
    return <Navigate to="/programm-info" replace />;
  }

  return <Outlet />;
}