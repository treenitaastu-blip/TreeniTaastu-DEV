import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
}

export default function ErrorBoundaryFallback({ error, resetError }: ErrorFallbackProps) {
  const navigate = useNavigate();

  const handleReset = () => {
    if (resetError) {
      resetError();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Oops! Midagi läks valesti</h1>
            <p className="text-muted-foreground">
              Tekkis ootamatu viga. Palun proovi uuesti või mine tagasi avalehele.
            </p>
          </div>

          {error && (
            <details className="text-left bg-muted p-4 rounded-lg text-sm">
              <summary className="cursor-pointer font-medium mb-2">Tehniline info</summary>
              <code className="text-xs text-muted-foreground break-words">
                {error.message || 'Unknown error'}
              </code>
            </details>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={handleReset} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Proovi uuesti
          </Button>
          
          <Button onClick={handleGoHome} variant="outline" className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            Mine avalehele
          </Button>
        </div>
      </div>
    </div>
  );
}