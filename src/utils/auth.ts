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

/**
 * Where a link to `username`'s profile should point.
 *
 * Every `/auction/profiles/*` route is 401 without a bearer token so sending a guest to the profile page lands them on the session-expired toast and a redirect they did not ask for.
 * They go straight to login instead, with the profile as the return url:
 *  the same shape the navbar already uses for its Create and Profile links.
 *
 * The return url is encoded where the navbar's are not, and has to be:
 *  this one carries a query string of its own, and an unencoded `?user=` would be read as a second parameter of the *login* url and dropped.
 */
export function profileHref(username: string): string {
  const profile = `/profile.html?user=${encodeURIComponent(username)}`;
  return isLoggedIn()
    ? profile
    : `/login.html?redirect=${encodeURIComponent(profile)}`;
}
