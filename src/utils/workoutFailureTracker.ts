/**
 * Workout Failure Tracking System
 * Tracks and monitors failed workout completions
 */

import { supabase } from "@/integrations/supabase/client";
import { logWorkoutError, ErrorCategory } from "@/utils/errorLogger";

// Workout failure types
export enum WorkoutFailureType {
  SESSION_END_FAILED = 'session_end_failed',
  PROGRESSION_ANALYSIS_FAILED = 'progression_analysis_failed',
  DATA_SAVE_FAILED = 'data_save_failed',
  NETWORK_ERROR = 'network_error',
  PERMISSION_ERROR = 'permission_error',
  VALIDATION_ERROR = 'validation_error',
  UNKNOWN_ERROR = 'unknown_error'
}

// Workout failure context
export interface WorkoutFailureContext {
  userId: string;
  sessionId?: string;
  programId?: string;
  dayId?: string;
  exerciseCount?: number;
  completedExercises?: number;
  sessionDuration?: number;
  failureType: WorkoutFailureType;
  errorMessage: string;
  stackTrace?: string;
  retryAttempts?: number;
  additionalData?: Record<string, any>;
}

// Workout failure entry
export interface WorkoutFailureEntry {
  id?: string;
  user_id: string;
  session_id?: string;
  program_id?: string;
  day_id?: string;
  failure_type: WorkoutFailureType;
  error_message: string;
  stack_trace?: string;
  retry_attempts: number;
  resolved: boolean;
  context: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

// Workout failure tracker class
class WorkoutFailureTracker {
  private static instance: WorkoutFailureTracker;
  private failureQueue: WorkoutFailureEntry[] = [];
  private isOnline = navigator.onLine;

  private constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processFailureQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Process queue on page load
    this.processFailureQueue();
  }

  public static getInstance(): WorkoutFailureTracker {
    if (!WorkoutFailureTracker.instance) {
      WorkoutFailureTracker.instance = new WorkoutFailureTracker();
    }
    return WorkoutFailureTracker.instance;
  }

  /**
   * Track a workout failure
   */
  public trackFailure(context: WorkoutFailureContext): void {
    const failureEntry: WorkoutFailureEntry = {
      user_id: context.userId,
      session_id: context.sessionId,
      program_id: context.programId,
      day_id: context.dayId,
      failure_type: context.failureType,
      error_message: context.errorMessage,
      stack_trace: context.stackTrace,
      retry_attempts: context.retryAttempts || 0,
      resolved: false,
      context: {
        exerciseCount: context.exerciseCount,
        completedExercises: context.completedExercises,
        sessionDuration: context.sessionDuration,
        ...context.additionalData
      }
    };

    // Add to queue
    this.failureQueue.push(failureEntry);

    // Try to send immediately if online
    if (this.isOnline) {
      this.sendFailureToDatabase(failureEntry);
    }

    // Also log to error logger
    logWorkoutError(context.errorMessage, {
      userId: context.userId,
      sessionId: context.sessionId,
      programId: context.programId,
      dayId: context.dayId,
      action: 'workout_failure',
      component: 'WorkoutFailureTracker',
      additionalData: {
        failureType: context.failureType,
        retryAttempts: context.retryAttempts,
        ...context.additionalData
      }
    });
  }

  /**
   * Track session end failure
   */
  public trackSessionEndFailure(
    userId: string,
    sessionId: string,
    error: Error | string,
    context?: Partial<WorkoutFailureContext>
  ): void {
    this.trackFailure({
      userId,
      sessionId,
      failureType: WorkoutFailureType.SESSION_END_FAILED,
      errorMessage: typeof error === 'string' ? error : error.message,
      stackTrace: typeof error === 'string' ? undefined : error.stack,
      ...context
    });
  }

  /**
   * Track progression analysis failure
   */
  public trackProgressionFailure(
    userId: string,
    sessionId: string,
    error: Error | string,
    context?: Partial<WorkoutFailureContext>
  ): void {
    this.trackFailure({
      userId,
      sessionId,
      failureType: WorkoutFailureType.PROGRESSION_ANALYSIS_FAILED,
      errorMessage: typeof error === 'string' ? error : error.message,
      stackTrace: typeof error === 'string' ? undefined : error.stack,
      ...context
    });
  }

  /**
   * Track data save failure
   */
  public trackDataSaveFailure(
    userId: string,
    sessionId: string,
    error: Error | string,
    context?: Partial<WorkoutFailureContext>
  ): void {
    this.trackFailure({
      userId,
      sessionId,
      failureType: WorkoutFailureType.DATA_SAVE_FAILED,
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
    error: Error | string,
    context?: Partial<WorkoutFailureContext>
  ): void {
    this.trackFailure({
      userId,
      failureType: WorkoutFailureType.NETWORK_ERROR,
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
    error: Error | string,
    context?: Partial<WorkoutFailureContext>
  ): void {
    this.trackFailure({
      userId,
      failureType: WorkoutFailureType.PERMISSION_ERROR,
      errorMessage: typeof error === 'string' ? error : error.message,
      stackTrace: typeof error === 'string' ? undefined : error.stack,
      ...context
    });
  }

  /**
   * Send failure to database
   */
  private async sendFailureToDatabase(failureEntry: WorkoutFailureEntry): Promise<void> {
    try {
      const { error } = await supabase
        .from('workout_failures')
        .insert({
          user_id: failureEntry.user_id,
          session_id: failureEntry.session_id,
          program_id: failureEntry.program_id,
          day_id: failureEntry.day_id,
          failure_type: failureEntry.failure_type,
          error_message: failureEntry.error_message,
          stack_trace: failureEntry.stack_trace,
          retry_attempts: failureEntry.retry_attempts,
          resolved: failureEntry.resolved,
          context: failureEntry.context
        });

      if (error) {
        console.error('Failed to log workout failure to database:', error);
        // Don't throw - we don't want failure tracking to cause more errors
      }
    } catch (err) {
      console.error('Workout failure logging failed:', err);
    }
  }

  /**
   * Process failure queue when back online
   */
  private async processFailureQueue(): Promise<void> {
    if (!this.isOnline || this.failureQueue.length === 0) return;

    const failuresToProcess = [...this.failureQueue];
    this.failureQueue = [];

    for (const failureEntry of failuresToProcess) {
      await this.sendFailureToDatabase(failureEntry);
    }
  }

  /**
   * Get failure statistics
   */
  public async getFailureStats(): Promise<{
    total: number;
    byType: Record<WorkoutFailureType, number>;
    unresolved: number;
    last24h: number;
    last7d: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('workout_failures')
        .select('failure_type, resolved, created_at');

      if (error) throw error;

      const stats = {
        total: data.length,
        byType: {
          [WorkoutFailureType.SESSION_END_FAILED]: 0,
          [WorkoutFailureType.PROGRESSION_ANALYSIS_FAILED]: 0,
          [WorkoutFailureType.DATA_SAVE_FAILED]: 0,
          [WorkoutFailureType.NETWORK_ERROR]: 0,
          [WorkoutFailureType.PERMISSION_ERROR]: 0,
          [WorkoutFailureType.VALIDATION_ERROR]: 0,
          [WorkoutFailureType.UNKNOWN_ERROR]: 0
        },
        unresolved: 0,
        last24h: 0,
        last7d: 0
      };

      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      data.forEach(failure => {
        stats.byType[failure.failure_type as WorkoutFailureType]++;
        if (!failure.resolved) stats.unresolved++;
        
        const createdAt = new Date(failure.created_at);
        if (createdAt > last24h) stats.last24h++;
        if (createdAt > last7d) stats.last7d++;
      });

      return stats;
    } catch (error) {
      console.error('Failed to get failure stats:', error);
      return {
        total: 0,
        byType: {
          [WorkoutFailureType.SESSION_END_FAILED]: 0,
          [WorkoutFailureType.PROGRESSION_ANALYSIS_FAILED]: 0,
          [WorkoutFailureType.DATA_SAVE_FAILED]: 0,
          [WorkoutFailureType.NETWORK_ERROR]: 0,
          [WorkoutFailureType.PERMISSION_ERROR]: 0,
          [WorkoutFailureType.VALIDATION_ERROR]: 0,
          [WorkoutFailureType.UNKNOWN_ERROR]: 0
        },
        unresolved: 0,
        last24h: 0,
        last7d: 0
      };
    }
  }

  /**
   * Get recent failures
   */
  public async getRecentFailures(limit: number = 50): Promise<WorkoutFailureEntry[]> {
    try {
      const { data, error } = await supabase
        .from('workout_failures')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get recent failures:', error);
      return [];
    }
  }

  /**
   * Mark failure as resolved
   */
  public async markFailureResolved(failureId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('workout_failures')
        .update({ resolved: true, updated_at: new Date().toISOString() })
        .eq('id', failureId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to mark failure as resolved:', error);
    }
  }
}

// Create global instance
export const workoutFailureTracker = WorkoutFailureTracker.getInstance();

// Convenience functions
export const trackWorkoutFailure = (context: WorkoutFailureContext) => 
  workoutFailureTracker.trackFailure(context);

export const trackSessionEndFailure = (userId: string, sessionId: string, error: Error | string, context?: Partial<WorkoutFailureContext>) => 
  workoutFailureTracker.trackSessionEndFailure(userId, sessionId, error, context);

export const trackProgressionFailure = (userId: string, sessionId: string, error: Error | string, context?: Partial<WorkoutFailureContext>) => 
  workoutFailureTracker.trackProgressionFailure(userId, sessionId, error, context);

export const trackDataSaveFailure = (userId: string, sessionId: string, error: Error | string, context?: Partial<WorkoutFailureContext>) => 
  workoutFailureTracker.trackDataSaveFailure(userId, sessionId, error, context);

export const trackNetworkError = (userId: string, error: Error | string, context?: Partial<WorkoutFailureContext>) => 
  workoutFailureTracker.trackNetworkError(userId, error, context);

export const trackPermissionError = (userId: string, error: Error | string, context?: Partial<WorkoutFailureContext>) => 
  workoutFailureTracker.trackPermissionError(userId, error, context);

export default workoutFailureTracker;
