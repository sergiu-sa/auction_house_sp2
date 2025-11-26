import { getToken, getUser, isAuthenticated } from './storage';
import type { User } from '../types/api';

/**
 * Check if user is logged in
 */
export function isLoggedIn(): boolean {
  return isAuthenticated();
}

/**
 * Get the current logged-in user
 */
export function getCurrentUser(): User | null {
  return getUser();
}

/**
 * Require authentication - redirect to login if not authenticated
 * @param redirectUrl - URL to redirect after login
 */
export function requireAuth(redirectUrl?: string): void {
  if (!isAuthenticated()) {
    const redirect = redirectUrl || window.location.pathname;
    window.location.href = `/login.html?redirect=${encodeURIComponent(redirect)}`;
  }
}

/**
 * Redirect if already authenticated
 * @param defaultUrl - Default URL to redirect to
 */
export function redirectIfAuthenticated(
  defaultUrl: string = '/index.html'
): void {
  if (isAuthenticated()) {
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect') || defaultUrl;
    window.location.href = redirect;
  }
}

/**
 * Get authentication token for API requests
 */
export function getAuthToken(): string | null {
  return getToken();
}

/**
 * Check if current user owns a resource
 * @param ownerName - Resource owner's username
 */
export function isOwner(ownerName: string): boolean {
  const user = getCurrentUser();
  return user?.name === ownerName;
}