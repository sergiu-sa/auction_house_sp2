import { getToken, getUser, isAuthenticated, isTokenExpired } from './storage';
import { showSessionExpiredMessage } from './authLoader';
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

/**
 * Route guard for protected pages
 * Checks authentication and redirects to login with return URL if not authenticated
 * @param options - Configuration options
 * @returns boolean - true if authenticated, false if redirected
 */
export function protectedRoute(options?: {
  redirectUrl?: string;
  showError?: boolean;
}): boolean {
  if (!isAuthenticated()) {
    const redirect = options?.redirectUrl || window.location.pathname + window.location.search;

    // Show session expired message if token was expired
    if (isTokenExpired()) {
      showSessionExpiredMessage();
    }

    if (options?.showError) {
      console.error('Authentication required to access this page');
    }

    window.location.href = `/login.html?redirect=${encodeURIComponent(redirect)}`;
    return false;
  }
  return true;
}

/**
 * Route guard for pages that require ownership validation
 * Must be called after protectedRoute() to ensure user is logged in
 * @param ownerName - Resource owner's username
 * @param fallbackUrl - URL to redirect if user is not owner (default: home)
 * @returns boolean - true if user is owner, false if redirected
 */
export function requireOwnership(
  ownerName: string,
  fallbackUrl: string = '/index.html'
): boolean {
  const user = getCurrentUser();

  if (!user || user.name !== ownerName) {
    console.error('You do not have permission to access this resource');
    window.location.href = fallbackUrl;
    return false;
  }

  return true;
}

/**
 * Combined route guard for edit pages
 * Checks both authentication and ownership
 * @param ownerName - Resource owner's username
 * @returns boolean - true if authenticated and is owner, false if redirected
 */
export function protectedOwnerRoute(ownerName: string): boolean {
  if (!protectedRoute()) {
    return false;
  }

  return requireOwnership(ownerName, '/profile.html');
}