import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import useAccess from "@/hooks/useAccess";

export default function RequireStatic() {
  const loc = useLocation();
  const { status, user } = useAuth();
  const { loading, canStatic, isAdmin } = useAccess();

  // Check access permissions

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

  // Signed in but no Static access (admins always have access)
  if (!canStatic && !isAdmin) {
    return <Navigate to="/pricing" replace />;
  }

  return <Outlet />;
}
