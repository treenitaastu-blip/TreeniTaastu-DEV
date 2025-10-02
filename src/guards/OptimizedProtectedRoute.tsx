import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallbackPath?: string;
  showLoader?: boolean;
}

export default function OptimizedProtectedRoute({ 
  children, 
  fallbackPath = "/login",
  showLoader = true 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return showLoader ? (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    ) : null;
  }
  
  if (!user) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}