// src/guards/RequireAuth.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { isPreviewMode } from "@/utils/preview";
import PreviewFallback from "@/components/PreviewFallback";

export default function RequireAuth() {
  const loc = useLocation();
  const { status, user } = useAuth();

  // In preview mode, allow access without authentication
  if (isPreviewMode()) {
    return (
      <PreviewFallback requireAuth>
        <Outlet />
      </PreviewFallback>
    );
  }

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
