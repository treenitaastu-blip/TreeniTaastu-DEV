// src/components/UserFriendlyError.tsx
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserFriendlyErrorProps {
  error: string;
  onRetry?: () => void;
  className?: string;
}

export function UserFriendlyError({ error, onRetry, className }: UserFriendlyErrorProps) {
  // Convert technical errors to user-friendly messages
  const getFriendlyMessage = (errorMsg: string): string => {
    const lowerError = errorMsg.toLowerCase();
    
    if (lowerError.includes('network') || lowerError.includes('connection')) {
      return "Internetiühendusega on probleem. Palun kontrolli oma internetiühendust ja proovi uuesti.";
    }
    
    if (lowerError.includes('invalid login') || lowerError.includes('invalid email or password')) {
      return "E-post või parool on vale. Palun kontrolli oma andmeid ja proovi uuesti.";
    }
    
    if (lowerError.includes('user not found')) {
      return "Selle e-posti aadressiga kontot ei leitud. Palun loo konto või kontrolli e-posti aadressi.";
    }
    
    if (lowerError.includes('email already registered') || lowerError.includes('user already registered')) {
      return "See e-post on juba registreeritud. Proovi sisse logida või kasuta parooli taastamist.";
    }
    
    if (lowerError.includes('session expired') || lowerError.includes('token expired')) {
      return "Sinu sessioon on aegunud. Palun logi uuesti sisse.";
    }
    
    if (lowerError.includes('programday') || lowerError.includes('exercises does not exist')) {
      return "Treeningandmete laadimisel esines viga. Palun proovi lehte uuendada.";
    }
    
    if (lowerError.includes('access denied') || lowerError.includes('forbidden')) {
      return "Sul pole selleks toiminguks õigust. Palun võta ühendust toe meeskonnaga.";
    }
    
    // Default user-friendly message for unknown errors
    return "Midagi läks valesti. Palun proovi hiljem uuesti või võta meiega ühendust.";
  };

  const friendlyMessage = getFriendlyMessage(error);

  return (
    <Alert className={`border-orange-200 bg-orange-50 ${className}`}>
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-800">
        <div className="flex items-start justify-between gap-4">
          <p>{friendlyMessage}</p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="flex-shrink-0"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Proovi uuesti
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}