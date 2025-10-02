import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import useAccess from "@/hooks/useAccess";

export default function RequirePTOrTrial() {
  const loc = useLocation();
  const { status, user } = useAuth();
  const { loading, canPT, canStatic, isAdmin } = useAccess();

  if (status === "loading" || loading) {
    return (
      <div className="min-h-[40vh] grid place-items-center p-6 text-sm text-muted-foreground">
        Kontrollin ligipääsu…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: loc }} replace />;
  }

  // Allow access if user has PT access OR trial access (canStatic indicates trial users) OR is admin
  if (!canPT && !canStatic && !isAdmin) {
    return <Navigate to="/pricing" replace />;
  }

  return <Outlet />;
}