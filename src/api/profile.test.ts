import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getProfile,
  getProfileListings,
  getProfileBids,
  getProfileWins,
} from './profile';

const fetchMock = vi.fn();

function requestedUrl(): string {
  return fetchMock.mock.calls[0][0] as string;
}

/**
 * The username comes from `?user=` in the page URL and is pasted into an API path.
 * `apiClient` concatenates onto the base URL, so an unencoded `..` normalises away and the request lands on a different endpoint in the user's own session.
 */
describe('profile paths encode the username', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: {}, meta: {} }),
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps path traversal out of the request', async () => {
    await getProfile('../../auth/login');

    expect(requestedUrl()).not.toContain('/auth/login');
    expect(requestedUrl()).toContain('%2F');
  });

  it('encodes each nested profile route the same way', async () => {
    for (const [call, segment] of [
      [getProfileListings, '/listings'],
      [getProfileBids, '/bids'],
      [getProfileWins, '/wins'],
    ] as const) {
      fetchMock.mockClear();
      await call('../evil');

      expect(fetchMock.mock.calls[0][0]).toContain(
        `/auction/profiles/..%2Fevil${segment}`
      );
    }
  });

  it('leaves an ordinary username readable', async () => {
    await getProfile('Oltenks');

    expect(requestedUrl().endsWith('/auction/profiles/Oltenks')).toBe(true);
  });

  // `_listings` and `_wins` used to ride along on every call.
  // Nothing ever read either array;
  // the profile page fetches both from their own endpoints, and this call runs on every page load through the navbar's profile cache.
  it('does not ask for listings or wins it will not read', async () => {
    await getProfile('Oltenks');

    expect(requestedUrl()).not.toContain('_listings');
    expect(requestedUrl()).not.toContain('_wins');
  });
});
