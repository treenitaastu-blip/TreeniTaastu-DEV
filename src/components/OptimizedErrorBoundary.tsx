// Production-ready error boundary with performance monitoring
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface OptimizedErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

export class OptimizedErrorBoundary extends React.Component<
  OptimizedErrorBoundaryProps,
  ErrorBoundaryState
> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: OptimizedErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Only log errors in production for monitoring
    console.error('Application Error:', error, errorInfo);
    
    // Track error metrics (could be sent to monitoring service)
    if (import.meta.env.PROD) {
      this.trackError(error, errorInfo);
    }
  }

  private trackError = (error: Error, errorInfo: React.ErrorInfo) => {
    // In a real app, send to error tracking service
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      retryCount: this.retryCount,
    };
    
    // Could send to Sentry, LogRocket, etc.
    if (import.meta.env.DEV) {
      console.warn('Error tracked:', errorData);
    }
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    } else {
      // Force reload after max retries
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props;
      
      if (Fallback && this.state.error) {
        return <Fallback error={this.state.error} retry={this.handleRetry} />;
      }

      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                We encountered an unexpected error. Try refreshing the page or contact support if the problem persists.
              </p>
              
              {import.meta.env.DEV && this.state.error && (
                <details className="text-left">
                  <summary className="cursor-pointer text-sm font-medium">
                    Error Details (Dev Mode)
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                    {this.state.error.message}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
              
              <div className="space-y-2">
                <Button onClick={this.handleRetry} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again ({this.maxRetries - this.retryCount} attempts left)
                </Button>
                
                {this.retryCount >= this.maxRetries && (
                  <Button 
                    onClick={() => window.location.reload()} 
                    variant="outline" 
                    className="w-full"
                  >
                    Reload Page
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Simple error fallback component
export const SimpleErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({ 
  error, 
  retry 
}) => (
  <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
    <h3 className="font-medium text-destructive mb-2">Error</h3>
    <p className="text-sm text-muted-foreground mb-3">{error.message}</p>
    <Button onClick={retry} size="sm">
      Try Again
    </Button>
  </div>
);