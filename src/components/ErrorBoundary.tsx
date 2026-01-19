// src/components/ErrorBoundary.tsx
import React from "react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  /** Optional: render a custom fallback. */
  fallback?: React.ReactNode | ((err: Error | null, stack: string | null) => React.ReactNode);
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
  stack: string | null; // allow null safely
};

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    stack: null,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // componentStack can be an empty string; keep it nullable-friendly
    this.setState({ stack: errorInfo?.componentStack ?? null });
  }

  render() {
    const { hasError, error, stack } = this.state;
    const { fallback } = this.props;

    if (hasError) {
      if (typeof fallback === "function") return fallback(error, stack);
      if (fallback) return fallback;

      // User-friendly fallback UI - no technical details shown to users
      return (
        <div className="flex min-h-[60vh] items-center justify-center p-4">
          <div className="mx-auto w-full max-w-md rounded-lg border border-orange-200 bg-orange-50 p-6 text-center">
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
            <p className="mb-6 text-sm text-orange-800">
              Vabandame ebamugavuste pärast. Palun proovi lehte värskendada.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                onClick={() => window.location.reload()}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Värskenda lehte
              </button>
              <button
                type="button"
                className="inline-flex items-center rounded-md border border-orange-300 bg-white px-4 py-2 text-sm font-medium text-orange-900 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                onClick={() => this.setState({ hasError: false, error: null, stack: null })}
              >
                Proovi uuesti
              </button>
            </div>
            {/* Only show technical details in development */}
            {import.meta.env.DEV && error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-xs text-orange-700 hover:text-orange-900">
                  Tehniline info (ainult arendusrežiimis)
                </summary>
                <div className="mt-2 rounded bg-orange-100 p-2">
                  <p className="text-xs text-orange-900 mb-1">
                    <strong>Viga:</strong> {error.message}
                  </p>
                  {stack && (
                    <pre className="max-h-40 overflow-auto text-xs text-orange-800">
                      {stack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
