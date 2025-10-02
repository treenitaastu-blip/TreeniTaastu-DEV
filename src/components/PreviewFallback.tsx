import React from 'react';
import { isPreviewMode } from '@/utils/preview';

interface PreviewFallbackProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}

export default function PreviewFallback({ 
  children, 
  fallback, 
  requireAuth = false 
}: PreviewFallbackProps) {
  // In preview mode, bypass authentication requirements
  if (isPreviewMode() && requireAuth) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4">
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
              <span className="text-sm font-medium text-blue-800">Preview Mode</span>
            </div>
            <p className="text-sm text-blue-600 mt-1">
              This page requires authentication. In production, users would need to log in.
            </p>
          </div>
          {children}
        </div>
      </div>
    );
  }

  return fallback ? <>{fallback}</> : <>{children}</>;
}