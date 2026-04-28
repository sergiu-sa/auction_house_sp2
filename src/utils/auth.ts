import { getUser, isAuthenticated } from './storage';
import { logError } from './logger';
import type { User } from '../types/api';


export function isLoggedIn(): boolean {
  return isAuthenticated();
}

export function getCurrentUser(): User | null {
  return getUser();
}

export function redirectIfAuthenticated(
  defaultUrl: string = '/index.html'
): void {
  if (isAuthenticated()) {
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect') || defaultUrl;
    window.location.href = redirect;
  }
}

// Route guard. Returns true if authenticated; otherwise redirects to login and returns false.
export function protectedRoute(options?: {
  redirectUrl?: string;
  showError?: boolean;
}): boolean {
  if (!isAuthenticated()) {
    const redirect = options?.redirectUrl || window.location.pathname + window.location.search;

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

