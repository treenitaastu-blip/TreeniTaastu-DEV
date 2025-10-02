// Component to validate PT access and show helpful messages
import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import useAccess from "@/hooks/useAccess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Shield, Users, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

interface PTAccessValidatorProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export default function PTAccessValidator({ children, requireAdmin = false }: PTAccessValidatorProps) {
  const { user, status } = useAuth();
  const { loading, isAdmin, canPT, canStatic, error, reason } = useAccess();

  // Loading state
  if (status === "loading" || loading) {
    return (
      <div className="min-h-[40vh] grid place-items-center p-6">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Kontrollin ligipääsu...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-[40vh] grid place-items-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Autentimine vajalik
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Sellele lehele ligipääsemiseks pead olema sisse logitud.
            </p>
            <Button asChild className="w-full">
              <Link to="/login">Logi sisse</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Access validation error
  if (error) {
    return (
      <div className="min-h-[40vh] grid place-items-center p-6">
        <Card className="max-w-md border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Ligipääsu viga
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              Kontrolli oma interneti ühendust või proovi uuesti.
            </p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Proovi uuesti
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin access required but user is not admin
  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-[40vh] grid place-items-center p-6">
        <Card className="max-w-md border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <Users className="h-5 w-5" />
              Admin ligipääs vajalik
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              See lehekülg on ainult administraatoritele.
            </p>
            <div className="text-sm space-y-1">
              <div>Su praegune staatus: {reason}</div>
              <div>Admin õigused: {isAdmin ? "Jah" : "Ei"}</div>
            </div>
            <Button asChild className="w-full">
              <Link to="/programs">Tagasi programmide juurde</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // PT access required but user doesn't have it
  if (!canPT && !isAdmin) {
    return (
      <div className="min-h-[40vh] grid place-items-center p-6">
        <Card className="max-w-md border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600">
              <Calendar className="h-5 w-5" />
              Personaaltreeningu ligipääs puudub
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Sul puudub ligipääs personaaltreeningu funktsioonidele.
            </p>
            <div className="text-sm space-y-1 p-3 bg-muted/30 rounded-md">
              <div>Ligipääsu põhjus: {reason}</div>
              <div>PT õigused: {canPT ? "Jah" : "Ei"}</div>
              <div>Staatiline ligipääs: {canStatic ? "Jah" : "Ei"}</div>
            </div>
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link to="/personaaltreening">Vaata teenuseid</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/programm">Kasuta põhiprogrammi</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // All checks passed - render children
  return <>{children}</>;
}