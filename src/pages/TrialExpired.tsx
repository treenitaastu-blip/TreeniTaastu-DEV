import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, Sparkles, ArrowRight, Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { format } from "date-fns";
import { et } from "date-fns/locale";

export default function TrialExpired() {
  const { user } = useAuth();
  const trialStatus = useTrialStatus();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Main Card */}
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardHeader className="text-center space-y-4 pb-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center animate-pulse">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold">
                Proov on lõppenud
              </CardTitle>
              <CardDescription className="text-base">
                Sinu 7-päevane tasuta proov lõppes{" "}
                {trialStatus.trialEndsAt && (
                  <span className="font-medium text-foreground">
                    {format(new Date(trialStatus.trialEndsAt), 'd. MMMM', { locale: et })}
                  </span>
                )}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* What happened */}
            <Alert className="border-primary/30 bg-primary/5">
              <Sparkles className="h-4 w-4 text-primary" />
              <AlertDescription>
                <p className="font-medium mb-2">Täname, et proovisid Treenitaastu!</p>
                <p className="text-sm text-muted-foreground">
                  Loodame, et said väärtuslikke tulemusi ja kogemusi. 
                  Jätkamiseks vali endale sobiv tellimus.
                </p>
              </AlertDescription>
            </Alert>

            {/* What they lose */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground">
                Ilma tellimata kaotad ligipääsu:
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">❌</div>
                  <span>Kõik treeningprogrammid ja -kavad</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">❌</div>
                  <span>Progressi jälgimine ja statistika</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">❌</div>
                  <span>Tervisetõed ja mindfulness-õpped</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">❌</div>
                  <span>Oma treeningajalugu</span>
                </div>
              </div>
            </div>

            {/* What they keep */}
            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <h3 className="font-semibold text-sm text-green-800 dark:text-green-200 mb-2">
                ✅ Mis jääb alles:
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Sinu konto ja andmed on salvestatud. Kui tellid hiljem, saad kohe jätkata sealt, kus pooleli jäid!
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3 pt-4">
              <Button asChild className="w-full" size="lg" variant="default">
                <Link to="/pricing" className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Vaata tellimusi ja jätka treeningut
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button asChild variant="outline" size="sm">
                  <Link to="/home">
                    Tagasi avalehele
                  </Link>
                </Button>
                
                <Button asChild variant="outline" size="sm">
                  <Link to="/konto">
                    Vaata oma kontot
                  </Link>
                </Button>
              </div>
            </div>

            {/* Trust reminder */}
            <div className="text-center pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                <Heart className="h-3 w-3 inline mr-1 text-primary" />
                Alates 19.99€/kuu • Tühista igal ajal • Turvaline makse
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick value reminder */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Miks treenijad valivad Guided plaani?
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
            <span>💬 Iganädalased tagasisided</span>
            <span>📊 Personaalsed kohandused</span>
            <span>⚡ 24h tugi</span>
          </div>
        </div>
      </div>
    </div>
  );
}

