import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchStats } from './StatsBar';
import { setUser, clearAuth } from '../utils/storage';
import type { User } from '../types/api';

/**
 * The footer's "My Listings" tile and the profile hero's "Listings" tile show the same number and used to ask for it two different ways:
 *  the hero through `profileListings`, this through `getProfileListings` straight.
 * It was the last surface in the app reaching past the named-query layer, which is the shape F-001/F-002 were about.
 */

const fetchMock = vi.fn();

function urls(): string[] {
  return fetchMock.mock.calls.map((call) => call[0] as string);
}

const stored: User = {
  name: 'bidder',
  email: 'bidder@stud.noroff.no',
  credits: 1000,
};

/** Answers the three parallel requests in the order `fetchStats` issues them. */
function respondWith(listingsBody: unknown): void {
  const json = (body: unknown) => ({
    ok: true,
    status: 200,
    json: async () => body,
  });
  fetchMock.mockImplementation((url: string) => {
    if (url.includes('/listings')) return Promise.resolve(json(listingsBody));
    if (url.includes('/bids')) return Promise.resolve(json({ data: [] }));
    return Promise.resolve(json({ data: [] }));
  });
}

describe('fetchStats', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearAuth();
  });

  it('asks for the listing count through the named-query layer', async () => {
    setUser(stored);
    respondWith({ data: [], meta: { totalCount: 0, pageCount: 1 } });

    await fetchStats();

    const listingsUrl = urls().find((u) => u.includes('/listings'));
    expect(listingsUrl).toContain('/auction/profiles/bidder/listings');
    // The signature of profileListings, not of a hand-built query.
    expect(listingsUrl).toContain('sort=endsAt');
    expect(listingsUrl).toContain('sortOrder=desc');
  });

  it('fetches one row, because only the count is used', async () => {
    setUser(stored);
    respondWith({ data: [], meta: { totalCount: 40, pageCount: 40 } });

    await fetchStats();

    expect(urls().find((u) => u.includes('/listings'))).toContain('limit=1');
  });

  /**
   * The regression that matters. Counting the rows in hand would report the page size — with a
   * one-row page, every seller on the platform would show a single listing.
   */
  it('reports totalCount, not the number of rows returned', async () => {
    setUser(stored);
    respondWith({
      data: [{ id: 'one', title: 'A lot' }],
      meta: { totalCount: 40, pageCount: 40 },
    });

    const stats = await fetchStats();

    expect(stats?.myListings).toBe(40);
  });

  /**
   * The degraded path, pinned rather than left to be discovered.
   *
   * `profileListings` falls back to the rows in hand when a response carries no `meta`, and asking for one row makes that fallback report **1**;
   *   where the old unpaged call reported a page size.
   * Both are wrong for a total; this one is wrong more visibly.
   * The API does send `meta`, `fixtures:check` watches its shape, and there is no better number available from this response, so the behaviour stands;
   *    but it is asserted here so a future change to the fallback is a deliberate one rather than a silent shift in what the tile claims.
   */
  it('degrades to the row count when a response carries no meta', async () => {
    setUser(stored);
    respondWith({ data: [{ id: 'one', title: 'A lot' }] });

    const stats = await fetchStats();

    expect(stats?.myListings).toBe(1);
  });

  it('returns null when nobody is logged in', async () => {
    expect(await fetchStats()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
