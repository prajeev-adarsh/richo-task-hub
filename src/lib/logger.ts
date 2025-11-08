/**
 * Production-safe logging utility
 * Sanitizes error messages in production to prevent information disclosure
 */

const isProduction = import.meta.env.PROD;

/**
 * Sanitizes error objects for safe logging in production
 */
function sanitizeError(error: any): string {
  if (!isProduction) {
    // In development, return full error details
    return error instanceof Error ? error.message : String(error);
  }

  // In production, return generic message
  return 'An error occurred. Please try again.';
}

/**
 * Safe logger that sanitizes sensitive information in production
 */
export const logger = {
  /**
   * Log errors safely - detailed in dev, sanitized in production
   */
  error: (message: string, error?: any) => {
    if (!isProduction) {
      // Development: Log full details to console
      console.error(`[Error] ${message}`, error);
    } else {
      // Production: Only log to monitoring service (not implemented yet)
      // For now, silently fail to prevent information disclosure
      // TODO: Integrate with monitoring service (Sentry, LogRocket, etc.)
    }
  },

  /**
   * Log informational messages - only in development
   */
  info: (message: string, data?: any) => {
    if (!isProduction) {
      console.log(`[Info] ${message}`, data);
    }
  },

  /**
   * Log warnings - sanitized in production
   */
  warn: (message: string, data?: any) => {
    if (!isProduction) {
      console.warn(`[Warning] ${message}`, data);
    }
  },

  /**
   * Get user-friendly error message
   */
  getUserMessage: (error: any): string => {
    return sanitizeError(error);
  }
};
