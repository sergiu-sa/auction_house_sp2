import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getProfile } from '../api/profile';
import { getUser, setUser, clearAuth } from './storage';
import { fetchFreshProfile, invalidateProfileCache } from './profileCache';
import type { Profile, User } from '../types/api';

vi.mock('../api/profile', () => ({ getProfile: vi.fn() }));
vi.mock('./logger', () => ({ logError: vi.fn() }));

const mockedGetProfile = vi.mocked(getProfile);

const stored: User = {
  name: 'bidder',
  email: 'bidder@stud.noroff.no',
  credits: 1000,
};

function profileResponse(credits: number): { data: Profile } {
  return {
    data: {
      name: 'bidder',
      email: 'bidder@stud.noroff.no',
      bio: null,
      avatar: null,
      banner: null,
      credits,
      _count: { listings: 2, wins: 1 },
    } as Profile,
  };
}

describe('fetchFreshProfile', () => {
  beforeEach(() => {
    localStorage.clear();
    invalidateProfileCache();
    mockedGetProfile.mockReset();
  });

  it('returns null when nobody is logged in', async () => {
    expect(await fetchFreshProfile()).toBeNull();
    expect(mockedGetProfile).not.toHaveBeenCalled();
  });

  it('fetches on a cold cache and writes the result back to storage', async () => {
    setUser(stored);
    mockedGetProfile.mockResolvedValue(profileResponse(968));

    const user = await fetchFreshProfile();

    expect(user?.credits).toBe(968);
    expect(getUser()?.credits).toBe(968);
    expect(mockedGetProfile).toHaveBeenCalledWith('bidder');
  });

  it('serves the cache on the next call rather than refetching', async () => {
    setUser(stored);
    mockedGetProfile.mockResolvedValue(profileResponse(968));

    await fetchFreshProfile();
    const second = await fetchFreshProfile();

    expect(second?.credits).toBe(968);
    expect(mockedGetProfile).toHaveBeenCalledTimes(1);
  });

  /**
   * The bid path depends on this:
   *  the navbar caches the profile at page load, so without an invalidate the post-bid refetch never happens and the credit guard keeps the pre-bid balance.
   */
  it('refetches once the cache is invalidated', async () => {
    setUser(stored);
    mockedGetProfile.mockResolvedValue(profileResponse(968));
    await fetchFreshProfile();

    invalidateProfileCache();
    mockedGetProfile.mockResolvedValue(profileResponse(900));
    const afterBid = await fetchFreshProfile();

    expect(afterBid?.credits).toBe(900);
    expect(getUser()?.credits).toBe(900);
    expect(mockedGetProfile).toHaveBeenCalledTimes(2);
  });

  // Callers that repaint a balance have to be able to tell a refresh from a fallback, so a failed request reports nothing rather than handing back the stored user as though it were fresh.
  it('returns null when the request fails, leaving storage untouched', async () => {
    setUser(stored);
    mockedGetProfile.mockRejectedValue(new Error('offline'));

    expect(await fetchFreshProfile()).toBeNull();
    expect(getUser()?.credits).toBe(1000);
  });

  // The token has its own key.
  // A refresh rewrites the stored user wholesale, so this pins that it never reintroduces a second copy of the credential.
  it('never writes a token into the stored user', async () => {
    setUser(stored);
    mockedGetProfile.mockResolvedValue(profileResponse(968));

    await fetchFreshProfile();

    expect(Object.keys(getUser() ?? {})).not.toContain('accessToken');
    clearAuth();
  });
});
