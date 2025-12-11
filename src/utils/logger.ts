/**
 * Centralized logging utility
 * Provides consistent error logging and can be extended for production monitoring
 */

/**
 * Log levels
 */
export const LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

/**
 * Logger configuration
 */
interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  environment: 'development' | 'production';
}

/**
 * Default logger configuration
 */
const config: LoggerConfig = {
  enabled: true,
  level: LogLevel.INFO,
  environment: import.meta.env.MODE === 'production' ? 'production' : 'development',
};

/**
 * Format log message with timestamp and context
 */
function formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? `\n${JSON.stringify(context, null, 2)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

/**
 * Log error messages
 * In production, this could send to an error tracking service (e.g., Sentry)
 */
export function logError(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
  if (!config.enabled) return;

  const errorDetails = error instanceof Error ? {
    name: error.name,
    message: error.message,
    stack: error.stack,
  } : { error };

  const fullContext = { ...context, ...errorDetails };

  if (config.environment === 'development') {
    console.error(formatMessage(LogLevel.ERROR, message, fullContext));
  } else {
    console.error(formatMessage(LogLevel.ERROR, message, fullContext));
  }
}

