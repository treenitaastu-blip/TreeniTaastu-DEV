// Secure logging utility for production safety
// Prevents sensitive data exposure in production builds

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
}

class SecureLogger {
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    // Safely check environment variables
    this.isDevelopment = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;
    this.isProduction = typeof import.meta !== 'undefined' && import.meta.env?.PROD === true;
    
    // Fallback if import.meta is not available
    if (typeof this.isDevelopment === 'undefined') {
      this.isDevelopment = process.env.NODE_ENV === 'development';
      this.isProduction = process.env.NODE_ENV === 'production';
    }
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): LogEntry {
    return {
      level,
      message,
      data: data ? this.sanitizeData(data) : undefined,
      timestamp: new Date().toISOString()
    };
  }

  private sanitizeData(data: unknown): unknown {
    if (typeof data === 'string') {
      // Remove potential sensitive information
      return data
        .replace(/password[=:]\s*[^\s,]+/gi, 'password=***')
        .replace(/token[=:]\s*[^\s,]+/gi, 'token=***')
        .replace(/key[=:]\s*[^\s,]+/gi, 'key=***')
        .replace(/secret[=:]\s*[^\s,]+/gi, 'secret=***');
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        if (key.toLowerCase().includes('password') || 
            key.toLowerCase().includes('token') || 
            key.toLowerCase().includes('key') || 
            key.toLowerCase().includes('secret')) {
          sanitized[key] = '***';
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      return sanitized;
    }
    
    return data;
  }

  info(message: string, data?: unknown): void {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, data);
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, data);
    }
  }

  error(message: string, data?: unknown): void {
    // Always log errors, but sanitize data
    const entry = this.formatMessage('error', message, data);
    console.error(`[ERROR] ${entry.message}`, entry.data);
  }

  debug(message: string, data?: unknown): void {
    try {
      if (this.isDevelopment) {
        console.debug(`[DEBUG] ${message}`, data);
      }
    } catch (error) {
      // Fallback for production builds where console.debug might not be available
      if (typeof console !== 'undefined' && console.debug) {
        console.debug(`[DEBUG] ${message}`, data);
      }
    }
  }

  // Production-safe logging for critical events
  logCriticalEvent(event: string, details?: unknown): void {
    if (this.isProduction) {
      // In production, only log to external service or remove entirely
      // For now, we'll just not log to console
      return;
    }
    
    console.log(`[CRITICAL] ${event}`, details);
  }
}

// Export singleton instance
export const logger = new SecureLogger();

// Export individual methods for convenience
export const { info, warn, error, debug, logCriticalEvent } = logger;
