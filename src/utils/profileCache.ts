import type { User } from '../types/api';
import { getProfile } from '../api/profile';
import { getCurrentUser } from './auth';
import { setUser } from './storage';
import { logError } from './logger';

// Every page render asks for the profile so the navbar credits stay current; without this each one is a request.
const CACHE_TTL = 30000;
let profileCache: { data: User; timestamp: number } | null = null;

function getCachedProfile(): User | null {
  if (profileCache && Date.now() - profileCache.timestamp < CACHE_TTL) {
    return profileCache.data;
  }
  return null;
}

/** Call after anything that changes the stored user — an edited profile, a placed bid — or the next read serves the old one. */
export function invalidateProfileCache(): void {
  profileCache = null;
}

/**
 * The current user's profile, from the cache when it is warm and the API when it is not.
 *
 * Returns null when there is nothing fresh to give — nobody logged in, or the request failed.
 * Callers that only need *a* user already hold the stored one;
 *  callers acting on a balance that just changed need to know the difference, so this never passes stale data off as a refresh.
 */
export async function fetchFreshProfile(): Promise<User | null> {
  const user = getCurrentUser();
  if (!user) return null;

  const cached = getCachedProfile();
  if (cached) return cached;

  try {
    const profileResponse = await getProfile(user.name);
    if (profileResponse.data) {
      const profile = profileResponse.data;
      const updatedUser: User = {
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar,
        banner: profile.banner,
        bio: profile.bio,
        credits: profile.credits,
        _count: profile._count,
      };

      setUser(updatedUser);
      profileCache = { data: updatedUser, timestamp: Date.now() };
      return updatedUser;
    }
  } catch (error) {
    logError('Failed to fetch fresh user data', error);
  }

  return null;
}
