import type { ApiError } from '../types/api';
import { clearAuth, getToken } from '../utils/storage';
import { showSessionExpiredMessage } from '../utils/authLoader';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://v2.api.noroff.dev';
export const API_KEY = import.meta.env.VITE_API_KEY || '';

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

function handleUnauthorized(): void {
  clearAuth();
  showSessionExpiredMessage();

  const currentPath = window.location.pathname;
  if (!currentPath.includes('login') && !currentPath.includes('register')) {
    const returnUrl = window.location.pathname + window.location.search;

    // Delay so the toast is visible before navigation
    setTimeout(() => {
      window.location.href = `/login.html?redirect=${encodeURIComponent(returnUrl)}`;
    }, 1000);
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const token = getToken();

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

    // 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json();

    if (!response.ok) {
      const apiError = new ApiErrorClass(data as ApiError);

      // Token expired or invalid
      if (response.status === 401) {
        handleUnauthorized();
      }

      throw apiError;
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiErrorClass) {
      throw error;
    }

    throw new Error(
      error instanceof Error ? error.message : 'Network error occurred'
    );
  }
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit): Promise<T> =>
    apiClient<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> =>
    apiClient<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> =>
    apiClient<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestInit): Promise<T> =>
    apiClient<T>(endpoint, { ...options, method: 'DELETE' }),
};