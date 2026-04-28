// Centralized logging. Swap the implementation here when wiring up an external monitor.

export const LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

function formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? `\n${JSON.stringify(context, null, 2)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

// Single entry point for error logging across the app.
export function logError(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
  const errorDetails = error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : error !== undefined
      ? { error }
      : {};

  const fullContext = { ...context, ...errorDetails };
  console.error(formatMessage(LogLevel.ERROR, message, fullContext));
}

