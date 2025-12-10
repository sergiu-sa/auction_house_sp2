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

