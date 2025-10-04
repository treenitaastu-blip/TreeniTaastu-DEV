// src/guards/RequireAuth.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function RequireAuth() {
  const loc = useLocation();
  const { status, user } = useAuth();

  // Check authentication status

  if (status === "loading") {
    return (
      <div className="mx-auto my-16 max-w-md animate-pulse text-center text-sm text-muted-foreground">
        Laadin kasutajat…
      </div>
    );
  }

  if (!user) {
    const from = { pathname: loc.pathname, search: loc.search, hash: loc.hash };
    return <Navigate to="/login" state={{ from }} replace />;
  }

  return <Outlet />;
}
