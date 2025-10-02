// Enhanced error recovery component for PT system
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Home, Bug, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface ErrorRecoveryProps {
  error: string;
  context?: {
    programId?: string;
    dayId?: string;
    userId?: string;
    action?: string;
  };
  onRetry?: () => void;
  showDebugLink?: boolean;
}

export default function ErrorRecovery({ 
  error, 
  context, 
  onRetry, 
  showDebugLink = true 
}: ErrorRecoveryProps) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;
    
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  // Categorize errors and provide specific guidance
  const getErrorCategory = (errorText: string) => {
    const lowerError = errorText.toLowerCase();
    
    if (lowerError.includes("auth") || lowerError.includes("login") || lowerError.includes("sisse logitud")) {
      return {
        type: "auth",
        title: "Autentimise viga",
        suggestion: "Logi välja ja logi uuesti sisse",
        action: () => window.location.href = "/login"
      };
    }
    
    if (lowerError.includes("permission") || lowerError.includes("access") || lowerError.includes("ligipääs")) {
      return {
        type: "access",
        title: "Ligipääsu viga",
        suggestion: "Kontrolli oma tellimust või võta ühendust toega",
        action: () => window.location.href = "/personaaltreening"
      };
    }
    
    if (lowerError.includes("not found") || lowerError.includes("ei leitud") || lowerError.includes("404")) {
      return {
        type: "not_found", 
        title: "Andmed ei leitud",
        suggestion: "Kontrolli URL-i või mine tagasi programmide lehele",
        action: () => window.location.href = "/programs"
      };
    }
    
    if (lowerError.includes("network") || lowerError.includes("fetch") || lowerError.includes("connection")) {
      return {
        type: "network",
        title: "Võrgu viga",
        suggestion: "Kontrolli interneti ühendust ja proovi uuesti",
        action: handleRetry
      };
    }
    
    return {
      type: "unknown",
      title: "Tundmatu viga", 
      suggestion: "Proovi lehe uuesti laadida või võta ühendust toega",
      action: () => window.location.reload()
    };
  };

  const errorCategory = getErrorCategory(error);

  return (
    <div className="min-h-[40vh] grid place-items-center p-6">
      <Card className="max-w-md border-orange-200 bg-orange-50">
        <CardContent className="pt-6 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-orange-100 p-3">
              <svg
                className="h-6 w-6 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>
          
          <h2 className="mb-2 text-xl font-semibold text-orange-900">Midagi läks valesti</h2>
          
          <p className="text-sm text-orange-800 mb-6">
            {errorCategory.suggestion}
          </p>
          
          <div className="space-y-2">
            <Button 
              onClick={errorCategory.action} 
              className="w-full bg-orange-600 hover:bg-orange-700"
              disabled={retrying}
            >
              {retrying ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {errorCategory.type === "network" ? "Proovi uuesti" : "Lahenda probleem"}
            </Button>
            
            <Button asChild variant="outline" className="w-full border-orange-300">
              <Link to="/programs">
                <Home className="h-4 w-4 mr-2" />
                Tagasi programmide juurde
              </Link>
            </Button>
          </div>
          
          {/* Only show technical details in development */}
          {import.meta.env.DEV && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-xs text-orange-700 hover:text-orange-900">
                Tehniline info (ainult arendusrežiimis)
              </summary>
              <div className="mt-2 space-y-2">
                <Alert className="text-left">
                  <AlertDescription className="text-xs">
                    {error}
                  </AlertDescription>
                </Alert>
                
                {context && (
                  <div className="p-3 bg-orange-100 rounded-md text-xs space-y-1">
                    <div className="font-medium">Debug info:</div>
                    {context.programId && <div>Program ID: {context.programId}</div>}
                    {context.dayId && <div>Day ID: {context.dayId}</div>}
                    {context.userId && <div>User ID: {context.userId}</div>}
                    {context.action && <div>Action: {context.action}</div>}
                  </div>
                )}
                
                {showDebugLink && (
                  <Button asChild variant="ghost" className="w-full" size="sm">
                    <Link to="/pt-debug">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ava debug info
                    </Link>
                  </Button>
                )}
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}