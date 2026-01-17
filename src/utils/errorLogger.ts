/**
 * Comprehensive Error Logging System
 * Tracks and monitors errors across the application
 */

import { supabase } from "@/integrations/supabase/client";

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categories
export enum ErrorCategory {
  AUTH = 'auth',
  DATABASE = 'database',
  NETWORK = 'network',
  VALIDATION = 'validation',
  WORKOUT = 'workout',
  PROGRESSION = 'progression',
  PAYMENT = 'payment',
  UI = 'ui',
  SYSTEM = 'system'
}

// Error context interface
export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  programId?: string;
  exerciseId?: string;
  action?: string;
  component?: string;
  route?: string;
  userAgent?: string;
  timestamp?: string;
  additionalData?: Record<string, unknown>;
}

// Error log entry interface
export interface ErrorLogEntry {
  id?: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  stack?: string;
  context: ErrorContext;
  resolved: boolean;
  created_at?: string;
  updated_at?: string;
}

// Error logger class
class ErrorLogger {
  private static instance: ErrorLogger;
  private errorQueue: ErrorLogEntry[] = [];
  private isOnline = navigator.onLine;
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  private constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processErrorQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Process queue on page load
    this.processErrorQueue();
  }

  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  /**
   * Log an error with context
   */
  public logError(
    error: Error | string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    category: ErrorCategory = ErrorCategory.SYSTEM,
    context: ErrorContext = {}
  ): void {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'string' ? undefined : error.stack;

    const errorEntry: ErrorLogEntry = {
      severity,
      category,
      message: errorMessage,
      stack,
      context: {
        ...context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        route: window.location.pathname
      },
      resolved: false
    };

    // Add to queue
    this.errorQueue.push(errorEntry);

    // Try to send immediately if online
    if (this.isOnline) {
      this.sendErrorToDatabase(errorEntry);
    }

    // Also log to console for development
    if (import.meta.env.DEV) {
      console.error(`[${severity.toUpperCase()}] ${category}:`, errorMessage, context);
    }
  }

  /**
   * Log a critical error
   */
  public logCriticalError(
    error: Error | string,
    context: ErrorContext = {}
  ): void {
    this.logError(error, ErrorSeverity.CRITICAL, ErrorCategory.SYSTEM, context);
  }

  /**
   * Log a workout-related error
   */
  public logWorkoutError(
    error: Error | string,
    context: ErrorContext = {}
  ): void {
    this.logError(error, ErrorSeverity.HIGH, ErrorCategory.WORKOUT, context);
  }

  /**
   * Log a progression analysis error
   */
  public logProgressionError(
    error: Error | string,
    context: ErrorContext = {}
  ): void {
    this.logError(error, ErrorSeverity.MEDIUM, ErrorCategory.PROGRESSION, context);
  }

  /**
   * Log a database error
   */
  public logDatabaseError(
    error: Error | string,
    context: ErrorContext = {}
  ): void {
    this.logError(error, ErrorSeverity.HIGH, ErrorCategory.DATABASE, context);
  }

  /**
   * Log an authentication error
   */
  public logAuthError(
    error: Error | string,
    context: ErrorContext = {}
  ): void {
    this.logError(error, ErrorSeverity.HIGH, ErrorCategory.AUTH, context);
  }

  /**
   * Send error to database
   */
  private async sendErrorToDatabase(errorEntry: ErrorLogEntry): Promise<void> {
    try {
      const { error } = await supabase
        .from('error_logs')
        .insert({
          severity: errorEntry.severity,
          category: errorEntry.category,
          message: errorEntry.message,
          stack: errorEntry.stack,
          context: errorEntry.context,
          resolved: errorEntry.resolved
        });

      if (error) {
        console.error('Failed to log error to database:', error);
        // Don't throw - we don't want error logging to cause more errors
      }
    } catch (err) {
      console.error('Error logging failed:', err);
    }
  }

  /**
   * Process error queue when back online
   */
  private async processErrorQueue(): Promise<void> {
    if (!this.isOnline || this.errorQueue.length === 0) return;

    const errorsToProcess = [...this.errorQueue];
    this.errorQueue = [];

    for (const errorEntry of errorsToProcess) {
      await this.sendErrorToDatabase(errorEntry);
    }
  }

  /**
   * Get error statistics
   */
  public async getErrorStats(): Promise<{
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byCategory: Record<ErrorCategory, number>;
    unresolved: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('severity, category, resolved');

      if (error) throw error;

      const stats = {
        total: data.length,
        bySeverity: {
          [ErrorSeverity.LOW]: 0,
          [ErrorSeverity.MEDIUM]: 0,
          [ErrorSeverity.HIGH]: 0,
          [ErrorSeverity.CRITICAL]: 0
        },
        byCategory: {
          [ErrorCategory.AUTH]: 0,
          [ErrorCategory.DATABASE]: 0,
          [ErrorCategory.NETWORK]: 0,
          [ErrorCategory.VALIDATION]: 0,
          [ErrorCategory.WORKOUT]: 0,
          [ErrorCategory.PROGRESSION]: 0,
          [ErrorCategory.PAYMENT]: 0,
          [ErrorCategory.UI]: 0,
          [ErrorCategory.SYSTEM]: 0
        },
        unresolved: 0
      };

      data.forEach(error => {
        stats.bySeverity[error.severity as ErrorSeverity]++;
        stats.byCategory[error.category as ErrorCategory]++;
        if (!error.resolved) stats.unresolved++;
      });

      return stats;
    } catch (error) {
      console.error('Failed to get error stats:', error);
      return {
        total: 0,
        bySeverity: {
          [ErrorSeverity.LOW]: 0,
          [ErrorSeverity.MEDIUM]: 0,
          [ErrorSeverity.HIGH]: 0,
          [ErrorSeverity.CRITICAL]: 0
        },
        byCategory: {
          [ErrorCategory.AUTH]: 0,
          [ErrorCategory.DATABASE]: 0,
          [ErrorCategory.NETWORK]: 0,
          [ErrorCategory.VALIDATION]: 0,
          [ErrorCategory.WORKOUT]: 0,
          [ErrorCategory.PROGRESSION]: 0,
          [ErrorCategory.PAYMENT]: 0,
          [ErrorCategory.UI]: 0,
          [ErrorCategory.SYSTEM]: 0
        },
        unresolved: 0
      };
    }
  }

  /**
   * Mark error as resolved
   */
  public async markErrorResolved(errorId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('error_logs')
        .update({ resolved: true, updated_at: new Date().toISOString() })
        .eq('id', errorId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to mark error as resolved:', error);
    }
  }

  /**
   * Get recent errors
   */
  public async getRecentErrors(limit: number = 50): Promise<ErrorLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get recent errors:', error);
      return [];
    }
  }
}

// Create global instance
export const errorLogger = ErrorLogger.getInstance();

// Convenience functions
export const logError = (error: Error | string, severity?: ErrorSeverity, category?: ErrorCategory, context?: ErrorContext) => 
  errorLogger.logError(error, severity, category, context);

export const logCriticalError = (error: Error | string, context?: ErrorContext) => 
  errorLogger.logCriticalError(error, context);

export const logWorkoutError = (error: Error | string, context?: ErrorContext) => 
  errorLogger.logWorkoutError(error, context);

export const logProgressionError = (error: Error | string, context?: ErrorContext) => 
  errorLogger.logProgressionError(error, context);

export const logDatabaseError = (error: Error | string, context?: ErrorContext) => 
  errorLogger.logDatabaseError(error, context);

export const logAuthError = (error: Error | string, context?: ErrorContext) => 
  errorLogger.logAuthError(error, context);

export default errorLogger;
