import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Target, Lock } from "lucide-react";

export default function RequirePTOrShowPurchasePrompt() {
  const loc = useLocation();
  const { status, user } = useAuth();
  const trialStatus = useTrialStatus();

  if (status === "loading" || trialStatus.loading) {
    return (
      <div className="min-h-[40vh] grid place-items-center p-6 text-sm text-muted-foreground">
        Kontrollin ligipääsu…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: loc }} replace />;
  }

  // If user is on trial, show purchase prompt
  if (trialStatus.isOnTrial) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
        <div className="max-w-2xl mx-auto pt-20">
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <Lock className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-blue-900">
                Tellimus vajalik
              </CardTitle>
              <CardDescription className="text-blue-700">
                Minu programmid on saadaval ainult tellimuse ostmise järel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <div className="space-y-2">
                <p className="text-sm text-blue-800">
                  Sinu proovperiood on aktiivne, kuid personaalsete programmide ligipääs nõuab täiendavat tellimust.
                </p>
                <p className="text-sm text-blue-800">
                  Vaata meie teenuseid ja vali endale sobiv programm.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <Link to="/teenused">
                    <Target className="h-4 w-4 mr-2" />
                    Vaata teenuseid
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                  <Link to="/home">
                    Tagasi avalehele
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If user is not on trial, allow access (they have PT access)
  return <Outlet />;
}
