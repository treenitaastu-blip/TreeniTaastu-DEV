// Production-safe logging utility
export const logger = {
  info: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.log(`[INFO] ${message}`, data);
    }
  },
  
  warn: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.warn(`[WARN] ${message}`, data);
    } else {
      // In production, only warn for critical issues
      console.warn(message);
    }
  },
  
  error: (message: string, error?: any) => {
    // Always log errors, even in production
    console.error(`[ERROR] ${message}`, error);
  },
  
  debug: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.log(`[DEBUG] ${message}`, data);
    }
  }
};