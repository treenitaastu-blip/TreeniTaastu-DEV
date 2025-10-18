import React from 'react';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LoadingIndicatorProps {
  isLoading: boolean;
  loadingMessage?: string;
  progress?: number;
  error?: string;
  success?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showProgress?: boolean;
  showMessage?: boolean;
}

export function LoadingIndicator({
  isLoading,
  loadingMessage,
  progress,
  error,
  success,
  size = 'md',
  className,
  showProgress = false,
  showMessage = true
}: LoadingIndicatorProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  if (error) {
    return (
      <div className={cn('flex items-center gap-2 text-red-600', className)}>
        <XCircle className={iconSizeClasses[size]} />
        {showMessage && (
          <span className="text-sm font-medium">{error}</span>
        )}
      </div>
    );
  }

  if (success) {
    return (
      <div className={cn('flex items-center gap-2 text-green-600', className)}>
        <CheckCircle className={iconSizeClasses[size]} />
        {showMessage && (
          <span className="text-sm font-medium">Valmis!</span>
        )}
      </div>
    );
  }

  if (!isLoading) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-blue-600', sizeClasses[size])} />
      {showMessage && loadingMessage && (
        <span className="text-sm font-medium text-gray-700">{loadingMessage}</span>
      )}
      {showProgress && progress !== undefined && (
        <div className="flex items-center gap-2">
          <div className="w-16 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
        </div>
      )}
    </div>
  );
}

// Full screen loading overlay
export interface LoadingOverlayProps {
  isLoading: boolean;
  loadingMessage?: string;
  progress?: number;
  error?: string;
  success?: boolean;
  className?: string;
}

export function LoadingOverlay({
  isLoading,
  loadingMessage,
  progress,
  error,
  success,
  className
}: LoadingOverlayProps) {
  if (!isLoading && !error && !success) {
    return null;
  }

  return (
    <div className={cn(
      'fixed inset-0 bg-black/50 flex items-center justify-center z-50',
      className
    )}>
      <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
        <LoadingIndicator
          isLoading={isLoading}
          loadingMessage={loadingMessage}
          progress={progress}
          error={error}
          success={success}
          size="lg"
          showProgress={true}
          showMessage={true}
          className="justify-center"
        />
      </div>
    </div>
  );
}

// Inline loading state for buttons
export interface LoadingButtonProps {
  isLoading: boolean;
  loadingMessage?: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export function LoadingButton({
  isLoading,
  loadingMessage,
  children,
  disabled,
  className,
  onClick,
  type = 'button'
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-colors',
        'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {isLoading && loadingMessage ? loadingMessage : children}
    </button>
  );
}

// Loading state for forms
export interface LoadingFormProps {
  isLoading: boolean;
  loadingMessage?: string;
  children: React.ReactNode;
  className?: string;
}

export function LoadingForm({
  isLoading,
  loadingMessage,
  children,
  className
}: LoadingFormProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-md">
          <LoadingIndicator
            isLoading={true}
            loadingMessage={loadingMessage}
            size="md"
            showMessage={true}
            className="justify-center"
          />
        </div>
      )}
    </div>
  );
}
