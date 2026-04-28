import type { User } from '../types/api';

export function getToken(): string | null {
  return localStorage.getItem('token');
}

// Stores the token plus a timestamp used by isTokenExpired (client-side 7-day expiry).
export function setToken(token: string): void {
  localStorage.setItem('token', token);
  localStorage.setItem('tokenTimestamp', Date.now().toString());
}

export function removeToken(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('tokenTimestamp');
}

export function getUser(): User | null {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;

  try {
    return JSON.parse(userStr) as User;
  } catch {
    return null;
  }
}

export function setUser(user: User): void {
  localStorage.setItem('user', JSON.stringify(user));
}

export function removeUser(): void {
  localStorage.removeItem('user');
}

export function clearAuth(): void {
  removeToken();
  removeUser();
}

export function getTokenTimestamp(): number | null {
  const timestamp = localStorage.getItem('tokenTimestamp');
  return timestamp ? parseInt(timestamp, 10) : null;
}

// Client-side expiry: tokens go stale after 7 days.
export function isTokenExpired(): boolean {
  const token = getToken();
  const timestamp = getTokenTimestamp();

  // Token written but timestamp not yet flushed (login race) — treat as fresh.
  if (token && !timestamp) return false;

  if (!token || !timestamp) return true;

  const now = Date.now();
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

  return now - timestamp > sevenDaysInMs;
}

export function isAuthenticated(): boolean {
  const hasToken = !!getToken();

  if (!hasToken) return false;
  if (isTokenExpired()) {
    clearAuth();
    return false;
  }

  return true;
}

const WATCHLIST_KEY = 'watchedListings';

export function getWatchedListings(): string[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
}

export function isWatched(listingId: string): boolean {
  return getWatchedListings().includes(listingId);
}

// Returns the new watched state (true = now in watchlist).
export function toggleWatched(listingId: string): boolean {
  const list = getWatchedListings();
  const index = list.indexOf(listingId);
  if (index >= 0) {
    list.splice(index, 1);
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
    return false;
  }
  list.push(listingId);
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
  return true;
}