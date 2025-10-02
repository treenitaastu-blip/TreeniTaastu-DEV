// PT System Status Component
import { useAuth } from "@/hooks/useAuth";
import useAccess from "@/hooks/useAccess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function PTSystemStatus() {
  const { user, status } = useAuth();
  const access = useAccess();

  const getStatusColor = (condition: boolean) => {
    return condition ? "default" : "destructive";
  };

  const getStatusIcon = (condition: boolean) => {
    return condition ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />;
  };

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          PT System Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Authentication</span>
            <Badge variant={getStatusColor(!!user)}>
              {getStatusIcon(!!user)}
              {user ? "Sisse logitud" : "Mitte logitud"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Access Loading</span>
            <Badge variant={access.loading ? "secondary" : "default"}>
              {access.loading ? "Loading..." : "Ready"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Admin Access</span>
            <Badge variant={getStatusColor(access.isAdmin)}>
              {getStatusIcon(access.isAdmin)}
              {access.isAdmin ? "Yes" : "No"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">PT Access</span>
            <Badge variant={getStatusColor(access.canPT)}>
              {getStatusIcon(access.canPT)}
              {access.canPT ? "Yes" : "No"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Static Access</span>
            <Badge variant={getStatusColor(access.canStatic)}>
              {getStatusIcon(access.canStatic)}
              {access.canStatic ? "Yes" : "No"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Access Reason</span>
            <Badge variant="outline">{access.reason || "unknown"}</Badge>
          </div>
        </div>

        {access.error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive font-medium">Access Error:</p>
            <p className="text-sm text-destructive/80">{access.error}</p>
          </div>
        )}

        <div className="pt-4 border-t">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to="/pt-debug">Full Debug Details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}