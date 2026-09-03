import { getUser, isAuthenticated } from './storage';
import { logError } from './logger';
import { safeRedirectPath } from './validation';
import type { User } from '../types/api';

export function isLoggedIn(): boolean {
  return isAuthenticated();
}

export function getCurrentUser(): User | null {
  return getUser();
}

/**
 * Sends an already-signed-in visitor away from a login/register page.
 *
 * Returns true when it has started a navigation, so callers can stop:
 *   assigning `location.href` schedules the navigation, it does not halt the current script, and the rest of a page init would otherwise keep running and fetching on a page being left behind.
 * Same shape as `protectedRoute` below.
 */
export function redirectIfAuthenticated(
  defaultUrl: string = '/index.html'
): boolean {
  if (!isAuthenticated()) return false;

  const urlParams = new URLSearchParams(window.location.search);
  window.location.href = safeRedirectPath(
    urlParams.get('redirect'),
    defaultUrl
  );
  return true;
}

// Route guard. Returns true if authenticated; otherwise redirects to login and returns false.
export function protectedRoute(options?: {
  redirectUrl?: string;
  showError?: boolean;
}): boolean {
  if (!isAuthenticated()) {
    const redirect =
      options?.redirectUrl || window.location.pathname + window.location.search;

    if (options?.showError) {
      logError('Authentication required to access this page');
    }

    window.location.href = `/login.html?redirect=${encodeURIComponent(redirect)}`;
    return false;
  }
  return true;
}

// Ownership guard. Call AFTER protectedRoute(). Redirects to fallback if user isn't the owner.
export function requireOwnership(
  ownerName: string,
  fallbackUrl: string = '/index.html'
): boolean {
  const user = getCurrentUser();

  if (!user || user.name !== ownerName) {
    logError('You do not have permission to access this resource', undefined, {
      ownerName,
      currentUser: user?.name,
    });
    window.location.href = fallbackUrl;
    return false;
  }

  return true;
}
