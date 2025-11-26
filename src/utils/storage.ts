import type { User } from '../types/api';

/**
 * Get the authentication token from localStorage
 */
export function getToken(): string | null {
  return localStorage.getItem('token');
}

/**
 * Set the authentication token in localStorage
 */
export function setToken(token: string): void {
  localStorage.setItem('token', token);
}

/**
 * Remove the authentication token from localStorage
 */
export function removeToken(): void {
  localStorage.removeItem('token');
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
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getToken();
}