import type { ApiError } from '../types/api';
import { clearAuth } from '../utils/storage';
import { showSessionExpiredMessage } from '../utils/authLoader';

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://v2.api.noroff.dev';
export const API_KEY = import.meta.env.VITE_API_KEY || '';

/**
 * Custom error class for API errors
 */
export class ApiErrorClass extends Error {
  statusCode: number;
  errors: Array<{ message: string; code?: string }>;

  constructor(error: ApiError) {
    super(error.errors[0]?.message || 'An error occurred');
    this.name = 'ApiError';
    this.statusCode = error.statusCode;
    this.errors = error.errors;
  }
}

/**
 * Handle 401 Unauthorized responses
 * Clears authentication and redirects to login
 */
function handleUnauthorized(): void {
  // Clear stored auth data
  clearAuth();

  // Show session expired notification
  showSessionExpiredMessage();

  // Only redirect if not already on login/register pages
  const currentPath = window.location.pathname;
  if (!currentPath.includes('login') && !currentPath.includes('register')) {
    // Store the current URL to redirect back after login
    const returnUrl = window.location.pathname + window.location.search;

    // Delay redirect slightly to show the notification
    setTimeout(() => {
      window.location.href = `/login.html?redirect=${encodeURIComponent(returnUrl)}`;
    }, 1000);
  }
}

/**
 * Base fetch client with authentication and error handling
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  // Get token from localStorage
  const token = localStorage.getItem('token');

  // Set default headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(API_KEY && { 'X-Noroff-API-Key': API_KEY }),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json();

    // Check if response is an error
    if (!response.ok) {
      const apiError = new ApiErrorClass(data as ApiError);

      // Handle 401 Unauthorized - token expired or invalid
      if (response.status === 401) {
        handleUnauthorized();
      }

      throw apiError;
    }

    return data as T;
  } catch (error) {
    // Re-throw ApiError
    if (error instanceof ApiErrorClass) {
      throw error;
    }

    // Network errors or other issues
    throw new Error(
      error instanceof Error ? error.message : 'Network error occurred'
    );
  }
}

/**
 * Helper functions for common HTTP methods
 */
export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiClient<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiClient<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiClient<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiClient<T>(endpoint, { ...options, method: 'DELETE' }),
};