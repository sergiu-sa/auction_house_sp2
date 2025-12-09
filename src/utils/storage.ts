import type { User } from '../types/api';

/**
 * Get the authentication token from localStorage
 */
export function getToken(): string | null {
  return localStorage.getItem('token');
}

/**
 * Set the authentication token in localStorage
 * Also stores the timestamp when the token was set
 */
export function setToken(token: string): void {
  localStorage.setItem('token', token);
  localStorage.setItem('tokenTimestamp', Date.now().toString());
}

/**
 * Remove the authentication token from localStorage
 */
export function removeToken(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('tokenTimestamp');
}

/**
 * Get the current user from localStorage
 */
export function getUser(): User | null {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;

  try {
    return JSON.parse(userStr) as User;
  } catch {
    return null;
  }
}

/**
 * Set the current user in localStorage
 */
export function setUser(user: User): void {
  localStorage.setItem('user', JSON.stringify(user));
}

/**
 * Remove the current user from localStorage
 */
export function removeUser(): void {
  localStorage.removeItem('user');
}

/**
 * Clear all authentication data from localStorage
 */
export function clearAuth(): void {
  removeToken();
  removeUser();
}

/**
 * Get the token timestamp from localStorage
 */
export function getTokenTimestamp(): number | null {
  const timestamp = localStorage.getItem('tokenTimestamp');
  return timestamp ? parseInt(timestamp, 10) : null;
}

/**
 * Check if the token has expired
 * Tokens are considered expired after 7 days
 */
export function isTokenExpired(): boolean {
  const token = getToken();
  const timestamp = getTokenTimestamp();

  
  // This handles race conditions during login
  if (token && !timestamp) return false;

  if (!token || !timestamp) return true;

  const now = Date.now();
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

  return now - timestamp > sevenDaysInMs;
}

/**
 * Check if user is authenticated and token is not expired
 */
export function isAuthenticated(): boolean {
  const hasToken = !!getToken();

  if (!hasToken) return false;

  // Check if token is expired
  if (isTokenExpired()) {
    clearAuth();
    return false;
  }

  return true;
}