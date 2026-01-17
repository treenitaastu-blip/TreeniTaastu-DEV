/**
 * Progression Analysis Monitoring System
 * Tracks and monitors progression analysis failures and performance
 */

import { supabase } from "@/integrations/supabase/client";
import { logProgressionError, ErrorCategory } from "@/utils/errorLogger";

// Progression analysis failure types
export enum ProgressionFailureType {
  ANALYSIS_FUNCTION_ERROR = 'analysis_function_error',
  DATA_VALIDATION_ERROR = 'data_validation_error',
  PERMISSION_ERROR = 'permission_error',
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error',
  INSUFFICIENT_DATA = 'insufficient_data',
  CALCULATION_ERROR = 'calculation_error',
  UNKNOWN_ERROR = 'unknown_error'
}

// Progression analysis context
export interface ProgressionAnalysisContext {
  userId: string;
  sessionId?: string;
  programId?: string;
  dayId?: string;
  exerciseId?: string;
  failureType: ProgressionFailureType;
  errorMessage: string;
  stackTrace?: string;
  analysisData?: {
    exerciseCount?: number;
    completedExercises?: number;
    rpeData?: unknown[];
    rirData?: unknown[];
    previousProgression?: unknown;
  };
  retryAttempts?: number;
  additionalData?: Record<string, unknown>;
}

// Progression analysis entry
export interface ProgressionAnalysisEntry {
  id?: string;
  user_id: string;
  session_id?: string;
  program_id?: string;
  day_id?: string;
  exercise_id?: string;
  failure_type: ProgressionFailureType;
  error_message: string;
  stack_trace?: string;
  analysis_data: Record<string, unknown>;
  retry_attempts: number;
  resolved: boolean;
  context: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

// Progression analysis monitor class
class ProgressionMonitor {
  private static instance: ProgressionMonitor;
  private analysisQueue: ProgressionAnalysisEntry[] = [];
  private isOnline = navigator.onLine;

  private constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processAnalysisQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Process queue on page load
    this.processAnalysisQueue();
  }

  public static getInstance(): ProgressionMonitor {
    if (!ProgressionMonitor.instance) {
      ProgressionMonitor.instance = new ProgressionMonitor();
    }
    return ProgressionMonitor.instance;
  }

  /**
   * Track a progression analysis failure
   */
  public trackAnalysisFailure(context: ProgressionAnalysisContext): void {
    const analysisEntry: ProgressionAnalysisEntry = {
      user_id: context.userId,
      session_id: context.sessionId,
      program_id: context.programId,
      day_id: context.dayId,
      exercise_id: context.exerciseId,
      failure_type: context.failureType,
      error_message: context.errorMessage,
      stack_trace: context.stackTrace,
      analysis_data: context.analysisData || {},
      retry_attempts: context.retryAttempts || 0,
      resolved: false,
      context: {
        ...context.additionalData
      }
    };

    // Add to queue
    this.analysisQueue.push(analysisEntry);

    // Try to send immediately if online
    if (this.isOnline) {
      this.sendAnalysisToDatabase(analysisEntry);
    }

    // Also log to error logger
    logProgressionError(context.errorMessage, {
      userId: context.userId,
      sessionId: context.sessionId,
      programId: context.programId,
      dayId: context.dayId,
      exerciseId: context.exerciseId,
      action: 'progression_analysis_failure',
      component: 'ProgressionMonitor',
      additionalData: {
        failureType: context.failureType,
        retryAttempts: context.retryAttempts,
        ...context.additionalData
      }
    });
  }

  /**
   * Track analysis function error
   */
  public trackAnalysisFunctionError(
    userId: string,
    sessionId: string,
    error: Error | string,
    context?: Partial<ProgressionAnalysisContext>
  ): void {
    this.trackAnalysisFailure({
      userId,
      sessionId,
      failureType: ProgressionFailureType.ANALYSIS_FUNCTION_ERROR,
      errorMessage: typeof error === 'string' ? error : error.message,
      stackTrace: typeof error === 'string' ? undefined : error.stack,
      ...context
    });
  }

  /**
   * Track data validation error
   */
  public trackDataValidationError(
    userId: string,
    sessionId: string,
    error: Error | string,
    context?: Partial<ProgressionAnalysisContext>
  ): void {
    this.trackAnalysisFailure({
      userId,
      sessionId,
      failureType: ProgressionFailureType.DATA_VALIDATION_ERROR,
      errorMessage: typeof error === 'string' ? error : error.message,
      stackTrace: typeof error === 'string' ? undefined : error.stack,
      ...context
    });
  }

  /**
   * Track permission error
   */
  public trackPermissionError(
    userId: string,
    sessionId: string,
    error: Error | string,
    context?: Partial<ProgressionAnalysisContext>
  ): void {
    this.trackAnalysisFailure({
      userId,
      sessionId,
      failureType: ProgressionFailureType.PERMISSION_ERROR,
      errorMessage: typeof error === 'string' ? error : error.message,
      stackTrace: typeof error === 'string' ? undefined : error.stack,
      ...context
    });
  }

  /**
   * Track network error
   */
  public trackNetworkError(
    userId: string,
    sessionId: string,
    error: Error | string,
    context?: Partial<ProgressionAnalysisContext>
  ): void {
    this.trackAnalysisFailure({
      userId,
      sessionId,
      failureType: ProgressionFailureType.NETWORK_ERROR,
      errorMessage: typeof error === 'string' ? error : error.message,
      stackTrace: typeof error === 'string' ? undefined : error.stack,
      ...context
    });
  }

  /**
   * Track timeout error
   */
  public trackTimeoutError(
    userId: string,
    sessionId: string,
    error: Error | string,
    context?: Partial<ProgressionAnalysisContext>
  ): void {
    this.trackAnalysisFailure({
      userId,
      sessionId,
      failureType: ProgressionFailureType.TIMEOUT_ERROR,
      errorMessage: typeof error === 'string' ? error : error.message,
      stackTrace: typeof error === 'string' ? undefined : error.stack,
      ...context
    });
  }

  /**
   * Track insufficient data error
   */
  public trackInsufficientDataError(
    userId: string,
    sessionId: string,
    error: Error | string,
    context?: Partial<ProgressionAnalysisContext>
  ): void {
    this.trackAnalysisFailure({
      userId,
      sessionId,
      failureType: ProgressionFailureType.INSUFFICIENT_DATA,
      errorMessage: typeof error === 'string' ? error : error.message,
      stackTrace: typeof error === 'string' ? undefined : error.stack,
      ...context
    });
  }

  /**
   * Track calculation error
   */
  public trackCalculationError(
    userId: string,
    sessionId: string,
    error: Error | string,
    context?: Partial<ProgressionAnalysisContext>
  ): void {
    this.trackAnalysisFailure({
      userId,
      sessionId,
      failureType: ProgressionFailureType.CALCULATION_ERROR,
      errorMessage: typeof error === 'string' ? error : error.message,
      stackTrace: typeof error === 'string' ? undefined : error.stack,
      ...context
    });
  }

  /**
   * Send analysis to database
   */
  private async sendAnalysisToDatabase(analysisEntry: ProgressionAnalysisEntry): Promise<void> {
    try {
      const { error } = await supabase
        .from('progression_analysis_failures')
        .insert({
          user_id: analysisEntry.user_id,
          session_id: analysisEntry.session_id,
          program_id: analysisEntry.program_id,
          day_id: analysisEntry.day_id,
          exercise_id: analysisEntry.exercise_id,
          failure_type: analysisEntry.failure_type,
          error_message: analysisEntry.error_message,
          stack_trace: analysisEntry.stack_trace,
          analysis_data: analysisEntry.analysis_data,
          retry_attempts: analysisEntry.retry_attempts,
          resolved: analysisEntry.resolved,
          context: analysisEntry.context
        });

      if (error) {
        console.error('Failed to log progression analysis failure to database:', error);
        // Don't throw - we don't want analysis tracking to cause more errors
      }
    } catch (err) {
      console.error('Progression analysis logging failed:', err);
    }
  }

  /**
   * Process analysis queue when back online
   */
  private async processAnalysisQueue(): Promise<void> {
    if (!this.isOnline || this.analysisQueue.length === 0) return;

    const analysesToProcess = [...this.analysisQueue];
    this.analysisQueue = [];

    for (const analysisEntry of analysesToProcess) {
      await this.sendAnalysisToDatabase(analysisEntry);
    }
  }

  /**
   * Get analysis statistics
   */
  public async getAnalysisStats(): Promise<{
    total: number;
    byType: Record<ProgressionFailureType, number>;
    unresolved: number;
    last24h: number;
    last7d: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('progression_analysis_failures')
        .select('failure_type, resolved, created_at');

      if (error) throw error;

      const stats = {
        total: data.length,
        byType: {
          [ProgressionFailureType.ANALYSIS_FUNCTION_ERROR]: 0,
          [ProgressionFailureType.DATA_VALIDATION_ERROR]: 0,
          [ProgressionFailureType.PERMISSION_ERROR]: 0,
          [ProgressionFailureType.NETWORK_ERROR]: 0,
          [ProgressionFailureType.TIMEOUT_ERROR]: 0,
          [ProgressionFailureType.INSUFFICIENT_DATA]: 0,
          [ProgressionFailureType.CALCULATION_ERROR]: 0,
          [ProgressionFailureType.UNKNOWN_ERROR]: 0
        },
        unresolved: 0,
        last24h: 0,
        last7d: 0
      };

      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      data.forEach(analysis => {
        stats.byType[analysis.failure_type as ProgressionFailureType]++;
        if (!analysis.resolved) stats.unresolved++;
        
        const createdAt = new Date(analysis.created_at);
        if (createdAt > last24h) stats.last24h++;
        if (createdAt > last7d) stats.last7d++;
      });

      return stats;
    } catch (error) {
      console.error('Failed to get analysis stats:', error);
      return {
        total: 0,
        byType: {
          [ProgressionFailureType.ANALYSIS_FUNCTION_ERROR]: 0,
          [ProgressionFailureType.DATA_VALIDATION_ERROR]: 0,
          [ProgressionFailureType.PERMISSION_ERROR]: 0,
          [ProgressionFailureType.NETWORK_ERROR]: 0,
          [ProgressionFailureType.TIMEOUT_ERROR]: 0,
          [ProgressionFailureType.INSUFFICIENT_DATA]: 0,
          [ProgressionFailureType.CALCULATION_ERROR]: 0,
          [ProgressionFailureType.UNKNOWN_ERROR]: 0
        },
        unresolved: 0,
        last24h: 0,
        last7d: 0
      };
    }
  }

  /**
   * Get recent analysis failures
   */
  public async getRecentAnalysisFailures(limit: number = 50): Promise<ProgressionAnalysisEntry[]> {
    try {
      const { data, error } = await supabase
        .from('progression_analysis_failures')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get recent analysis failures:', error);
      return [];
    }
  }

  /**
   * Mark analysis failure as resolved
   */
  public async markAnalysisFailureResolved(failureId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('progression_analysis_failures')
        .update({ resolved: true, updated_at: new Date().toISOString() })
        .eq('id', failureId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to mark analysis failure as resolved:', error);
    }
  }
}

// Create global instance
export const progressionMonitor = ProgressionMonitor.getInstance();

// Convenience functions
export const trackProgressionAnalysisFailure = (context: ProgressionAnalysisContext) => 
  progressionMonitor.trackAnalysisFailure(context);

export const trackAnalysisFunctionError = (userId: string, sessionId: string, error: Error | string, context?: Partial<ProgressionAnalysisContext>) => 
  progressionMonitor.trackAnalysisFunctionError(userId, sessionId, error, context);

export const trackDataValidationError = (userId: string, sessionId: string, error: Error | string, context?: Partial<ProgressionAnalysisContext>) => 
  progressionMonitor.trackDataValidationError(userId, sessionId, error, context);

export const trackProgressionPermissionError = (userId: string, sessionId: string, error: Error | string, context?: Partial<ProgressionAnalysisContext>) => 
  progressionMonitor.trackPermissionError(userId, sessionId, error, context);

export const trackProgressionNetworkError = (userId: string, sessionId: string, error: Error | string, context?: Partial<ProgressionAnalysisContext>) => 
  progressionMonitor.trackNetworkError(userId, sessionId, error, context);

export const trackProgressionTimeoutError = (userId: string, sessionId: string, error: Error | string, context?: Partial<ProgressionAnalysisContext>) => 
  progressionMonitor.trackTimeoutError(userId, sessionId, error, context);

export const trackInsufficientDataError = (userId: string, sessionId: string, error: Error | string, context?: Partial<ProgressionAnalysisContext>) => 
  progressionMonitor.trackInsufficientDataError(userId, sessionId, error, context);

export const trackCalculationError = (userId: string, sessionId: string, error: Error | string, context?: Partial<ProgressionAnalysisContext>) => 
  progressionMonitor.trackCalculationError(userId, sessionId, error, context);

export default progressionMonitor;
