import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { et } from "date-fns/locale";

interface TrialWarningBannerProps {
  daysRemaining: number;
  trialEndsAt: string;
  isUrgent?: boolean;
}

export function TrialWarningBanner({ 
  daysRemaining, 
  trialEndsAt,
  isUrgent = false 
}: TrialWarningBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  
  // Check if banner was dismissed today
  useEffect(() => {
    const dismissedDate = localStorage.getItem("trial_warning_dismissed");
    const today = new Date().toDateString();
    
    if (dismissedDate === today) {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    const today = new Date().toDateString();
    localStorage.setItem("trial_warning_dismissed", today);
    setIsDismissed(true);
  };

  // Don't show if dismissed or if more than 3 days remaining
  if (isDismissed || daysRemaining > 3) {
    return null;
  }

  const endDate = new Date(trialEndsAt);
  
  return (
    <Alert 
      className={`
        border-l-4 animate-slide-in-top relative
        ${isUrgent 
          ? 'border-l-destructive bg-destructive/10 border-destructive/30' 
          : 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {isUrgent ? (
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 animate-pulse" />
        ) : (
          <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
        )}
        
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <AlertTitle className={`text-base font-semibold ${isUrgent ? 'text-destructive' : 'text-yellow-800 dark:text-yellow-200'}`}>
              {isUrgent ? '⚠️ Viimane päev!' : '⏰ Proov lõpeb peagi'}
            </AlertTitle>
            
            {!isUrgent && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-yellow-100 dark:hover:bg-yellow-900"
                onClick={handleDismiss}
                aria-label="Sulge teade"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <AlertDescription className="space-y-3">
            <div className="text-sm">
              {isUrgent ? (
                <p className="text-destructive font-medium">
                  Sinu tasuta proov lõpeb <strong>
                    {daysRemaining === 0 ? 'täna' : 'homme'}
                  </strong>! 
                  <br />
                  Tellimata jäädes kaotad kohe ligipääsu kõigile programmidele.
                </p>
              ) : (
                <p className="text-yellow-800 dark:text-yellow-200">
                  Tasuta proov lõpeb: <strong className="text-foreground">
                    {format(endDate, 'd. MMMM yyyy', { locale: et })}
                  </strong> ({daysRemaining} päeva)
                  <br />
                  <span className="text-sm text-muted-foreground">
                    Jätka treeningteekonda ilma katkestuseta
                  </span>
                </p>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                size="sm" 
                variant={isUrgent ? "destructive" : "default"} 
                asChild
              >
                <Link to="/pricing">
                  {isUrgent ? '🔥 Uuenda kohe' : 'Vaata tellimusi'}
                </Link>
              </Button>
              
              {!isUrgent && (
                <Button size="sm" variant="outline" onClick={handleDismiss}>
                  Meenuta homme
                </Button>
              )}
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}


