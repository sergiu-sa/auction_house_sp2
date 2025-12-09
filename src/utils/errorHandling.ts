/**
 * Type-safe error handling utilities
 */

import { ApiErrorClass } from '../api/config';

/**
 * Type guard to check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiErrorClass {
  return error instanceof ApiErrorClass;
}

/**
 * Type guard to check if error is a standard Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Extract error message from unknown error type
 */
export function getErrorMessage(error: unknown, defaultMessage = 'An error occurred'): string {
  if (isApiError(error)) {
    return error.errors[0]?.message || defaultMessage;
  }

  if (isError(error)) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  // For objects with errors array (API error format)
  if (
    error &&
    typeof error === 'object' &&
    'errors' in error &&
    Array.isArray(error.errors) &&
    error.errors.length > 0
  ) {
    return (error.errors[0] as { message: string }).message || defaultMessage;
  }

  return defaultMessage;
}

/**
 * Safe error handler that extracts message and logs appropriately
 */
export function handleError(
  error: unknown,
  context: string,
  defaultMessage?: string
): string {
  const message = getErrorMessage(error, defaultMessage);

  // Log the full error for debugging
  if (import.meta.env.MODE === 'development') {
    console.error(`[${context}]`, error);
  } else {
    console.error(`[${context}]`, message);
  }

  return message;
}

/**
 * Type-safe async error wrapper
 * Wraps async functions and handles errors in a type-safe way
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: unknown) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    if (errorHandler) {
      errorHandler(error);
    } else {
      console.error('Error in tryCatch:', error);
    }
    return null;
  }
}

/**
 * Assert that a value is defined (not null or undefined)
 * Useful for narrowing types
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message = 'Value is required'
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T>(
  json: string,
  fallback: T
): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}
