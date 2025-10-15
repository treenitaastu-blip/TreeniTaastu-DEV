import { Link } from "react-router-dom";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Clock, Sparkles } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { et } from "date-fns/locale";

interface TrialStatusBannerProps {
  trialEndsAt: string;
  product?: string;
}

export function TrialStatusBanner({ trialEndsAt, product = "Static" }: TrialStatusBannerProps) {
  const endDate = new Date(trialEndsAt);
  const today = new Date();
  const daysRemaining = differenceInDays(endDate, today);
  
  // Don't show if trial has expired
  if (daysRemaining < 0) return null;
  
  // Determine urgency level
  const isUrgent = daysRemaining <= 2;
  const isWarning = daysRemaining <= 4;
  
  return (
    <Alert 
      className={`
        border-l-4 animate-fade-in
        ${isUrgent ? 'border-l-destructive bg-destructive/10 border-destructive/30' : ''}
        ${isWarning && !isUrgent ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200' : ''}
        ${!isWarning ? 'border-l-primary bg-primary/5 border-primary/20' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {isUrgent ? (
          <Clock className="h-5 w-5 text-destructive mt-0.5 animate-pulse" />
        ) : (
          <Sparkles className="h-5 w-5 text-primary mt-0.5" />
        )}
        
        <div className="flex-1 space-y-2">
          <AlertTitle className={`text-base font-semibold ${isUrgent ? 'text-destructive' : isWarning ? 'text-yellow-800 dark:text-yellow-200' : 'text-primary'}`}>
            {isUrgent ? '⚠️ Proov lõpeb varsti!' : '🎁 Kasutad 7-päevast tasuta proovi'}
          </AlertTitle>
          
          <AlertDescription className="space-y-3">
            <div className="text-sm">
              {isUrgent ? (
                <p className="text-destructive font-medium">
                  Sinu tasuta proov lõpeb <strong>{daysRemaining === 0 ? 'täna' : daysRemaining === 1 ? 'homme' : `${daysRemaining} päeva pärast`}</strong>!
                  Ilma tellimata kaotad ligipääsu kõigile programmidele.
                </p>
              ) : (
                <>
                  <p className={isWarning ? 'text-yellow-800 dark:text-yellow-200' : 'text-muted-foreground'}>
                    Proov lõpeb: <strong className="text-foreground">{format(endDate, 'd. MMMM yyyy', { locale: et })}</strong>
                    {daysRemaining > 0 && ` (${daysRemaining} päeva)`}
                  </p>
                  {!isWarning && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Sul on täielik ligipääs {product} programmidele kuni proovi lõpuni
                    </p>
                  )}
                </>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={isUrgent ? "destructive" : "default"} asChild>
                <Link to="/pricing">
                  {isUrgent ? 'Uuenda kohe' : 'Vali tellimus'}
                </Link>
              </Button>
              
              <Button size="sm" variant="outline" asChild>
                <Link to="/konto">
                  Vaata plaani
                </Link>
              </Button>
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}


