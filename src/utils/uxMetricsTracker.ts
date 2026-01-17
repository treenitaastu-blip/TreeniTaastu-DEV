/**
 * User Experience Metrics Tracking System
 * Tracks user behavior, engagement, and experience quality metrics
 */

import { supabase } from "@/integrations/supabase/client";

// DISABLE UX METRICS TRACKING TEMPORARILY
const UX_METRICS_ENABLED = false;

// UX metric categories
export enum UXMetricCategory {
  ENGAGEMENT = 'engagement',
  PERFORMANCE = 'performance',
  USABILITY = 'usability',
  SATISFACTION = 'satisfaction',
  CONVERSION = 'conversion',
  RETENTION = 'retention',
  ERROR_RECOVERY = 'error_recovery',
  MOBILE_EXPERIENCE = 'mobile_experience'
}

// UX metric types
export enum UXMetricType {
  // Engagement metrics
  PAGE_VIEW = 'page_view',
  SESSION_DURATION = 'session_duration',
  FEATURE_USAGE = 'feature_usage',
  INTERACTION_COUNT = 'interaction_count',
  SCROLL_DEPTH = 'scroll_depth',
  CLICK_THROUGH_RATE = 'click_through_rate',
  
  // Performance metrics
  LOAD_TIME = 'load_time',
  RESPONSE_TIME = 'response_time',
  RENDER_TIME = 'render_time',
  API_RESPONSE_TIME = 'api_response_time',
  CACHE_HIT_RATE = 'cache_hit_rate',
  
  // Usability metrics
  TASK_COMPLETION_RATE = 'task_completion_rate',
  ERROR_RATE = 'error_rate',
  ABANDONMENT_RATE = 'abandonment_rate',
  RETRY_RATE = 'retry_rate',
  HELP_SEEKING_BEHAVIOR = 'help_seeking_behavior',
  
  // Satisfaction metrics
  RATING = 'rating',
  FEEDBACK = 'feedback',
  NPS_SCORE = 'nps_score',
  CSAT_SCORE = 'csat_score',
  
  // Conversion metrics
  SIGNUP_RATE = 'signup_rate',
  TRIAL_CONVERSION = 'trial_conversion',
  SUBSCRIPTION_RATE = 'subscription_rate',
  FEATURE_ADOPTION = 'feature_adoption',
  
  // Retention metrics
  DAILY_ACTIVE_USERS = 'daily_active_users',
  WEEKLY_ACTIVE_USERS = 'weekly_active_users',
  MONTHLY_ACTIVE_USERS = 'monthly_active_users',
  CHURN_RATE = 'churn_rate',
  STICKINESS = 'stickiness',
  
  // Error recovery metrics
  ERROR_RECOVERY_TIME = 'error_recovery_time',
  SUCCESS_RATE_AFTER_ERROR = 'success_rate_after_error',
  USER_FRUSTRATION_LEVEL = 'user_frustration_level',
  
  // Mobile experience metrics
  MOBILE_USAGE_PATTERN = 'mobile_usage_pattern',
  TOUCH_INTERACTION = 'touch_interaction',
  ORIENTATION_CHANGE = 'orientation_change',
  NETWORK_CONDITION = 'network_condition'
}

// UX metric context
export interface UXMetricContext {
  userId?: string;
  sessionId?: string;
  pageUrl?: string;
  userAgent?: string;
  screenResolution?: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  browserType?: string;
  osType?: string;
  networkType?: string;
  timestamp?: string;
  additionalData?: Record<string, unknown>;
}

// UX metric entry
export interface UXMetricEntry {
  id?: string;
  user_id?: string;
  session_id?: string;
  category: UXMetricCategory;
  metric_type: UXMetricType;
  metric_value: number;
  metric_unit?: string;
  context: UXMetricContext;
  created_at?: string;
}

// UX metrics tracker class
class UXMetricsTracker {
  private static instance: UXMetricsTracker;
  private metricsQueue: UXMetricEntry[] = [];
  private isOnline = navigator.onLine;
  private sessionId: string;
  private sessionStartTime: number;

  private constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sessionStartTime = Date.now();

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processMetricsQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Track session start
    this.trackSessionStart();

    // Process queue on page load
    this.processMetricsQueue();
  }

  public static getInstance(): UXMetricsTracker {
    if (!UXMetricsTracker.instance) {
      UXMetricsTracker.instance = new UXMetricsTracker();
    }
    return UXMetricsTracker.instance;
  }

  /**
   * Track a UX metric
   */
  public trackMetric(
    category: UXMetricCategory,
    metricType: UXMetricType,
    value: number,
    unit?: string,
    context: UXMetricContext = {}
  ): void {
    // DISABLE UX METRICS TRACKING TEMPORARILY
    if (!UX_METRICS_ENABLED) return;
    const metricEntry: UXMetricEntry = {
      user_id: context.userId,
      session_id: this.sessionId,
      category,
      metric_type: metricType,
      metric_value: value,
      metric_unit: unit,
      context: {
        ...context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        deviceType: this.getDeviceType(),
        browserType: this.getBrowserType(),
        osType: this.getOSType(),
        networkType: this.getNetworkType(),
        pageUrl: window.location.href
      }
    };

    // Add to queue
    this.metricsQueue.push(metricEntry);

    // Try to send immediately if online
    if (this.isOnline) {
      this.sendMetricToDatabase(metricEntry);
    }
  }

  /**
   * Track page view
   */
  public trackPageView(pageUrl: string, context?: Partial<UXMetricContext>): void {
    // DISABLE UX METRICS TRACKING TEMPORARILY
    if (!UX_METRICS_ENABLED) return;
    this.trackMetric(
      UXMetricCategory.ENGAGEMENT,
      UXMetricType.PAGE_VIEW,
      1,
      'count',
      { pageUrl, ...context }
    );
  }

  /**
   * Track session duration
   */
  public trackSessionDuration(): void {
    const duration = Date.now() - this.sessionStartTime;
    this.trackMetric(
      UXMetricCategory.ENGAGEMENT,
      UXMetricType.SESSION_DURATION,
      duration,
      'milliseconds'
    );
  }

  /**
   * Track feature usage
   */
  public trackFeatureUsage(featureName: string, context?: Partial<UXMetricContext>): void {
    this.trackMetric(
      UXMetricCategory.ENGAGEMENT,
      UXMetricType.FEATURE_USAGE,
      1,
      'count',
      { additionalData: { featureName }, ...context }
    );
  }

  /**
   * Track load time
   */
  public trackLoadTime(loadTime: number, pageUrl?: string, context?: Partial<UXMetricContext>): void {
    // DISABLE UX METRICS TRACKING TEMPORARILY
    if (!UX_METRICS_ENABLED) return;
    this.trackMetric(
      UXMetricCategory.PERFORMANCE,
      UXMetricType.LOAD_TIME,
      loadTime,
      'milliseconds',
      { pageUrl, ...context }
    );
  }

  /**
   * Track API response time
   */
  public trackAPIResponseTime(endpoint: string, responseTime: number, context?: Partial<UXMetricContext>): void {
    this.trackMetric(
      UXMetricCategory.PERFORMANCE,
      UXMetricType.API_RESPONSE_TIME,
      responseTime,
      'milliseconds',
      { additionalData: { endpoint }, ...context }
    );
  }

  /**
   * Track task completion
   */
  public trackTaskCompletion(taskName: string, success: boolean, context?: Partial<UXMetricContext>): void {
    this.trackMetric(
      UXMetricCategory.USABILITY,
      UXMetricType.TASK_COMPLETION_RATE,
      success ? 1 : 0,
      'boolean',
      { additionalData: { taskName, success }, ...context }
    );
  }

  /**
   * Track error rate
   */
  public trackErrorRate(errorType: string, context?: Partial<UXMetricContext>): void {
    this.trackMetric(
      UXMetricCategory.USABILITY,
      UXMetricType.ERROR_RATE,
      1,
      'count',
      { additionalData: { errorType }, ...context }
    );
  }

  /**
   * Track user rating
   */
  public trackRating(rating: number, component?: string, context?: Partial<UXMetricContext>): void {
    this.trackMetric(
      UXMetricCategory.SATISFACTION,
      UXMetricType.RATING,
      rating,
      'score',
      { additionalData: { component }, ...context }
    );
  }

  /**
   * Track conversion
   */
  public trackConversion(conversionType: string, value?: number, context?: Partial<UXMetricContext>): void {
    this.trackMetric(
      UXMetricCategory.CONVERSION,
      UXMetricType.FEATURE_ADOPTION,
      value || 1,
      'count',
      { additionalData: { conversionType }, ...context }
    );
  }

  /**
   * Track mobile interaction
   */
  public trackMobileInteraction(interactionType: string, context?: Partial<UXMetricContext>): void {
    this.trackMetric(
      UXMetricCategory.MOBILE_EXPERIENCE,
      UXMetricType.TOUCH_INTERACTION,
      1,
      'count',
      { additionalData: { interactionType }, ...context }
    );
  }

  /**
   * Track session start
   */
  private trackSessionStart(): void {
    // DISABLE UX METRICS TRACKING TEMPORARILY
    if (!UX_METRICS_ENABLED) return;
    this.trackMetric(
      UXMetricCategory.ENGAGEMENT,
      UXMetricType.SESSION_DURATION,
      0,
      'milliseconds',
      { additionalData: { event: 'session_start' } }
    );
  }

  /**
   * Get device type
   */
  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = screen.width;
    if (width <= 768) return 'mobile';
    if (width <= 1024) return 'tablet';
    return 'desktop';
  }

  /**
   * Get browser type
   */
  private getBrowserType(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  /**
   * Get OS type
   */
  private getOSType(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  /**
   * Get network type
   */
  private getNetworkType(): string {
    // @ts-ignore - navigator.connection is not in all browsers
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      return connection.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  /**
   * Send metric to database
   */
  private async sendMetricToDatabase(metricEntry: UXMetricEntry): Promise<void> {
    try {
      const { error } = await supabase
        .from('ux_metrics')
        .insert({
          user_id: metricEntry.user_id,
          session_id: metricEntry.session_id,
          category: metricEntry.category,
          metric_type: metricEntry.metric_type,
          metric_value: metricEntry.metric_value,
          metric_unit: metricEntry.metric_unit,
          context: metricEntry.context
        });

      if (error) {
        console.error('Failed to log UX metric to database:', error);
        // Don't throw - we don't want UX tracking to cause more errors
      }
    } catch (err) {
      console.error('UX metric logging failed:', err);
    }
  }

  /**
   * Process metrics queue when back online
   */
  private async processMetricsQueue(): Promise<void> {
    if (!this.isOnline || this.metricsQueue.length === 0) return;

    const metricsToProcess = [...this.metricsQueue];
    this.metricsQueue = [];

    for (const metricEntry of metricsToProcess) {
      await this.sendMetricToDatabase(metricEntry);
    }
  }

  /**
   * Get UX metrics statistics
   */
  public async getUXMetricsStats(): Promise<{
    total: number;
    byCategory: Record<UXMetricCategory, number>;
    byType: Record<UXMetricType, number>;
    last24h: number;
    last7d: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('ux_metrics')
        .select('category, metric_type, created_at');

      if (error) throw error;

      const stats = {
        total: data.length,
        byCategory: {
          [UXMetricCategory.ENGAGEMENT]: 0,
          [UXMetricCategory.PERFORMANCE]: 0,
          [UXMetricCategory.USABILITY]: 0,
          [UXMetricCategory.SATISFACTION]: 0,
          [UXMetricCategory.CONVERSION]: 0,
          [UXMetricCategory.RETENTION]: 0,
          [UXMetricCategory.ERROR_RECOVERY]: 0,
          [UXMetricCategory.MOBILE_EXPERIENCE]: 0
        },
        byType: {
          [UXMetricType.PAGE_VIEW]: 0,
          [UXMetricType.SESSION_DURATION]: 0,
          [UXMetricType.FEATURE_USAGE]: 0,
          [UXMetricType.INTERACTION_COUNT]: 0,
          [UXMetricType.SCROLL_DEPTH]: 0,
          [UXMetricType.CLICK_THROUGH_RATE]: 0,
          [UXMetricType.LOAD_TIME]: 0,
          [UXMetricType.RESPONSE_TIME]: 0,
          [UXMetricType.RENDER_TIME]: 0,
          [UXMetricType.API_RESPONSE_TIME]: 0,
          [UXMetricType.CACHE_HIT_RATE]: 0,
          [UXMetricType.TASK_COMPLETION_RATE]: 0,
          [UXMetricType.ERROR_RATE]: 0,
          [UXMetricType.ABANDONMENT_RATE]: 0,
          [UXMetricType.RETRY_RATE]: 0,
          [UXMetricType.HELP_SEEKING_BEHAVIOR]: 0,
          [UXMetricType.RATING]: 0,
          [UXMetricType.FEEDBACK]: 0,
          [UXMetricType.NPS_SCORE]: 0,
          [UXMetricType.CSAT_SCORE]: 0,
          [UXMetricType.SIGNUP_RATE]: 0,
          [UXMetricType.TRIAL_CONVERSION]: 0,
          [UXMetricType.SUBSCRIPTION_RATE]: 0,
          [UXMetricType.FEATURE_ADOPTION]: 0,
          [UXMetricType.DAILY_ACTIVE_USERS]: 0,
          [UXMetricType.WEEKLY_ACTIVE_USERS]: 0,
          [UXMetricType.MONTHLY_ACTIVE_USERS]: 0,
          [UXMetricType.CHURN_RATE]: 0,
          [UXMetricType.STICKINESS]: 0,
          [UXMetricType.ERROR_RECOVERY_TIME]: 0,
          [UXMetricType.SUCCESS_RATE_AFTER_ERROR]: 0,
          [UXMetricType.USER_FRUSTRATION_LEVEL]: 0,
          [UXMetricType.MOBILE_USAGE_PATTERN]: 0,
          [UXMetricType.TOUCH_INTERACTION]: 0,
          [UXMetricType.ORIENTATION_CHANGE]: 0,
          [UXMetricType.NETWORK_CONDITION]: 0
        },
        last24h: 0,
        last7d: 0
      };

      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      data.forEach(metric => {
        stats.byCategory[metric.category as UXMetricCategory]++;
        stats.byType[metric.metric_type as UXMetricType]++;
        
        const createdAt = new Date(metric.created_at);
        if (createdAt > last24h) stats.last24h++;
        if (createdAt > last7d) stats.last7d++;
      });

      return stats;
    } catch (error) {
      console.error('Failed to get UX metrics stats:', error);
      return {
        total: 0,
        byCategory: {
          [UXMetricCategory.ENGAGEMENT]: 0,
          [UXMetricCategory.PERFORMANCE]: 0,
          [UXMetricCategory.USABILITY]: 0,
          [UXMetricCategory.SATISFACTION]: 0,
          [UXMetricCategory.CONVERSION]: 0,
          [UXMetricCategory.RETENTION]: 0,
          [UXMetricCategory.ERROR_RECOVERY]: 0,
          [UXMetricCategory.MOBILE_EXPERIENCE]: 0
        },
        byType: {
          [UXMetricType.PAGE_VIEW]: 0,
          [UXMetricType.SESSION_DURATION]: 0,
          [UXMetricType.FEATURE_USAGE]: 0,
          [UXMetricType.INTERACTION_COUNT]: 0,
          [UXMetricType.SCROLL_DEPTH]: 0,
          [UXMetricType.CLICK_THROUGH_RATE]: 0,
          [UXMetricType.LOAD_TIME]: 0,
          [UXMetricType.RESPONSE_TIME]: 0,
          [UXMetricType.RENDER_TIME]: 0,
          [UXMetricType.API_RESPONSE_TIME]: 0,
          [UXMetricType.CACHE_HIT_RATE]: 0,
          [UXMetricType.TASK_COMPLETION_RATE]: 0,
          [UXMetricType.ERROR_RATE]: 0,
          [UXMetricType.ABANDONMENT_RATE]: 0,
          [UXMetricType.RETRY_RATE]: 0,
          [UXMetricType.HELP_SEEKING_BEHAVIOR]: 0,
          [UXMetricType.RATING]: 0,
          [UXMetricType.FEEDBACK]: 0,
          [UXMetricType.NPS_SCORE]: 0,
          [UXMetricType.CSAT_SCORE]: 0,
          [UXMetricType.SIGNUP_RATE]: 0,
          [UXMetricType.TRIAL_CONVERSION]: 0,
          [UXMetricType.SUBSCRIPTION_RATE]: 0,
          [UXMetricType.FEATURE_ADOPTION]: 0,
          [UXMetricType.DAILY_ACTIVE_USERS]: 0,
          [UXMetricType.WEEKLY_ACTIVE_USERS]: 0,
          [UXMetricType.MONTHLY_ACTIVE_USERS]: 0,
          [UXMetricType.CHURN_RATE]: 0,
          [UXMetricType.STICKINESS]: 0,
          [UXMetricType.ERROR_RECOVERY_TIME]: 0,
          [UXMetricType.SUCCESS_RATE_AFTER_ERROR]: 0,
          [UXMetricType.USER_FRUSTRATION_LEVEL]: 0,
          [UXMetricType.MOBILE_USAGE_PATTERN]: 0,
          [UXMetricType.TOUCH_INTERACTION]: 0,
          [UXMetricType.ORIENTATION_CHANGE]: 0,
          [UXMetricType.NETWORK_CONDITION]: 0
        },
        last24h: 0,
        last7d: 0
      };
    }
  }

  /**
   * Get recent UX metrics
   */
  public async getRecentUXMetrics(limit: number = 50): Promise<UXMetricEntry[]> {
    try {
      const { data, error } = await supabase
        .from('ux_metrics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get recent UX metrics:', error);
      return [];
    }
  }
}

// Create global instance
export const uxMetricsTracker = UXMetricsTracker.getInstance();

// Convenience functions
export const trackUXMetric = (category: UXMetricCategory, metricType: UXMetricType, value: number, unit?: string, context?: UXMetricContext) => 
  uxMetricsTracker.trackMetric(category, metricType, value, unit, context);

export const trackPageView = (pageUrl: string, context?: Partial<UXMetricContext>) => 
  uxMetricsTracker.trackPageView(pageUrl, context);

export const trackFeatureUsage = (featureName: string, context?: Partial<UXMetricContext>) => 
  uxMetricsTracker.trackFeatureUsage(featureName, context);

export const trackLoadTime = (loadTime: number, pageUrl?: string, context?: Partial<UXMetricContext>) => 
  uxMetricsTracker.trackLoadTime(loadTime, pageUrl, context);

export const trackAPIResponseTime = (endpoint: string, responseTime: number, context?: Partial<UXMetricContext>) => 
  uxMetricsTracker.trackAPIResponseTime(endpoint, responseTime, context);

export const trackTaskCompletion = (taskName: string, success: boolean, context?: Partial<UXMetricContext>) => 
  uxMetricsTracker.trackTaskCompletion(taskName, success, context);

export const trackErrorRate = (errorType: string, context?: Partial<UXMetricContext>) => 
  uxMetricsTracker.trackErrorRate(errorType, context);

export const trackRating = (rating: number, component?: string, context?: Partial<UXMetricContext>) => 
  uxMetricsTracker.trackRating(rating, component, context);

export const trackConversion = (conversionType: string, value?: number, context?: Partial<UXMetricContext>) => 
  uxMetricsTracker.trackConversion(conversionType, value, context);

export const trackMobileInteraction = (interactionType: string, context?: Partial<UXMetricContext>) => 
  uxMetricsTracker.trackMobileInteraction(interactionType, context);

export default uxMetricsTracker;
