import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  activePool,
  activeStats,
  endingSoon,
  trending,
  newest,
  featuredActive,
  recentlyEnded,
  catalogPage,
  toSortKey,
  toSortOrder,
} from './listingQueries';
import type { Listing } from '../types/api';

const fetchMock = vi.fn();

function urls(): string[] {
  return fetchMock.mock.calls.map((call) => call[0] as string);
}

function respond(bodies: unknown[]): void {
  bodies.forEach((body) => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => body,
    });
  });
}

/** Minimal listing; only the fields the ranking code reads are real. */
function listing(over: Partial<Listing> & { id: string }): Listing {
  return {
    title: `Lot ${over.id}`,
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
    endsAt: '2099-01-01T00:00:00.000Z',
    ...over,
  } as Listing;
}

const page = (data: Listing[], meta: Record<string, unknown> = {}) => ({
  data,
  meta: { pageCount: 1, totalCount: data.length, ...meta },
});

describe('listingQueries', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => page([]),
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('activePool', () => {
    it('asks for the whole active pool in one request', async () => {
      await activePool();

      const url = urls()[0];
      expect(url).toContain('/auction/listings?');
      expect(url).toContain('_active=true');
      expect(url).toContain('limit=100');
      expect(url).toContain('_seller=true');
      expect(url).toContain('_bids=true');
    });

    it('follows meta.pageCount when the pool outgrows one page', async () => {
      respond([
        page([listing({ id: 'a' })], { pageCount: 3, totalCount: 210 }),
        page([listing({ id: 'b' })], { pageCount: 3, totalCount: 210 }),
        page([listing({ id: 'c' })], { pageCount: 3, totalCount: 210 }),
      ]);

      const pool = await activePool();

      expect(urls()).toHaveLength(3);
      expect(urls()[1]).toContain('page=2');
      expect(urls()[2]).toContain('page=3');
      expect(pool.map((l) => l.id)).toEqual(['a', 'b', 'c']);
    });

    it('walks the whole pool however many pages it spans', async () => {
      respond(
        Array.from({ length: 6 }, (_, i) =>
          page([listing({ id: `p${i + 1}` })], {
            pageCount: 6,
            totalCount: 540,
          })
        )
      );

      const pool = await activePool();

      expect(urls()).toHaveLength(6);
      expect(pool).toHaveLength(6);
    });

    it('does not paginate when one page holds the pool', async () => {
      respond([page([listing({ id: 'a' })], { pageCount: 1, totalCount: 1 })]);

      await activePool();

      expect(urls()).toHaveLength(1);
    });
  });

  describe('the _active=false trap', () => {
    it('omits _active entirely rather than sending false', async () => {
      await catalogPage({ activeOnly: false });

      expect(urls()[0]).not.toContain('_active');
    });
  });

  describe('endingSoon', () => {
    it('asks the server for the soonest-closing active lots', async () => {
      await endingSoon(4);

      const url = urls()[0];
      expect(url).toContain('_active=true');
      expect(url).toContain('sort=endsAt');
      expect(url).toContain('sortOrder=asc');
      expect(url).toContain('limit=4');
    });
  });

  describe('activeStats', () => {
    it('reads the active total from meta rather than counting rows', async () => {
      respond([
        page([listing({ id: 'next', endsAt: '2099-02-02T00:00:00.000Z' })], {
          totalCount: 53,
        }),
      ]);

      const stats = await activeStats();

      expect(urls()[0]).toContain('limit=1');
      expect(urls()[0]).toContain('_active=true');
      expect(stats.totalActive).toBe(53);
      expect(stats.nextToClose?.id).toBe('next');
    });
  });

  describe('client-side ranking over the active pool', () => {
    const pool = [
      listing({
        id: 'quiet',
        _count: { bids: 0 },
        created: '2026-05-01T00:00:00.000Z',
      }),
      listing({
        id: 'hot',
        _count: { bids: 9 },
        created: '2026-01-01T00:00:00.000Z',
      }),
      listing({
        id: 'warm',
        _count: { bids: 3 },
        created: '2026-03-01T00:00:00.000Z',
      }),
    ];

    it('trending ranks by bid count and drops lots with no bids', async () => {
      respond([page(pool)]);

      const result = await trending(3);

      expect(result.map((l) => l.id)).toEqual(['hot', 'warm']);
    });

    it('newest asks the server directly when it has no pool to rank', async () => {
      await newest(3);

      const url = urls()[0];
      expect(url).toContain('_active=true');
      expect(url).toContain('sort=created');
      expect(url).toContain('sortOrder=desc');
      expect(url).toContain('limit=3');
      expect(url).not.toContain('limit=100');
    });

    it('newest ranks by created, newest first, bids or not', async () => {
      respond([page(pool)]);

      const result = await newest(3);

      expect(result.map((l) => l.id)).toEqual(['quiet', 'warm', 'hot']);
    });

    it('featuredActive ranks by bid count but keeps quiet lots', async () => {
      respond([page(pool)]);

      const result = await featuredActive(3);

      expect(result.map((l) => l.id)).toEqual(['hot', 'warm', 'quiet']);
    });

    it('reuses a pool the caller already holds, so one page fetches once', async () => {
      respond([page(pool)]);
      const fetched = await activePool();
      const afterFetch = urls().length;

      const hot = await trending(3, fetched);
      const fresh = await newest(3, fetched);
      const featured = await featuredActive(3, fetched);

      expect(urls()).toHaveLength(afterFetch);
      expect(hot.map((l) => l.id)).toEqual(['hot', 'warm']);
      expect(fresh.map((l) => l.id)).toEqual(['quiet', 'warm', 'hot']);
      expect(featured.map((l) => l.id)).toEqual(['hot', 'warm', 'quiet']);
    });
  });

  describe('recentlyEnded', () => {
    it('over-fetches past the active head, because no ended filter exists', async () => {
      await recentlyEnded(1);

      const url = urls()[0];
      expect(url).toContain('sort=endsAt');
      expect(url).toContain('sortOrder=desc');
      expect(url).toContain('limit=100');
      expect(url).not.toContain('_active');
    });

    it('returns the most recently ended lot that has bids', async () => {
      const bid = [
        { id: 'b1', amount: 5, created: '2026-01-01T00:00:00.000Z' },
      ];
      respond([
        page([
          listing({
            id: 'future',
            endsAt: '2099-01-01T00:00:00.000Z',
            bids: bid,
          }),
          listing({
            id: 'ended-recent',
            endsAt: '2020-06-01T00:00:00.000Z',
            bids: bid,
          }),
          listing({
            id: 'ended-older',
            endsAt: '2020-01-01T00:00:00.000Z',
            bids: bid,
          }),
        ]),
      ]);

      const result = await recentlyEnded(1);

      expect(result.map((l) => l.id)).toEqual(['ended-recent']);
    });

    it('skips ended lots that nobody bid on', async () => {
      respond([
        page([
          listing({
            id: 'ended-no-bids',
            endsAt: '2020-06-01T00:00:00.000Z',
            bids: [],
          }),
          listing({
            id: 'ended-with-bids',
            endsAt: '2020-01-01T00:00:00.000Z',
            bids: [{ id: 'b', amount: 1, created: '2020-01-01T00:00:00.000Z' }],
          }),
        ]),
      ]);

      const result = await recentlyEnded(1);

      expect(result.map((l) => l.id)).toEqual(['ended-with-bids']);
    });
  });

  describe('catalogPage', () => {
    it('paginates on the server and reports the server totals', async () => {
      respond([
        page([listing({ id: 'x' })], { pageCount: 134, totalCount: 3200 }),
      ]);

      const result = await catalogPage({ page: 3, limit: 24 });

      expect(urls()[0]).toContain('page=3');
      expect(urls()[0]).toContain('limit=24');
      expect(result.totalCount).toBe(3200);
      expect(result.pageCount).toBe(134);
    });

    it('narrows to active lots with _active=true', async () => {
      await catalogPage({ activeOnly: true, page: 1, limit: 24 });

      expect(urls()[0]).toContain('_active=true');
    });

    it('filters categories with the server tag filter', async () => {
      await catalogPage({ tag: 'art' });

      expect(urls()[0]).toContain('_tag=art');
    });

    it('treats the "all" category as no tag at all', async () => {
      await catalogPage({ tag: 'all' });

      expect(urls()[0]).not.toContain('_tag');
    });

    it('sends a search to the search endpoint when browsing everything', async () => {
      await catalogPage({
        search: 'vintage',
        activeOnly: false,
        page: 2,
        limit: 24,
      });

      const url = urls()[0];
      expect(url).toContain('/auction/listings/search?');
      expect(url).toContain('q=vintage');
      expect(url).toContain('page=2');
    });

    it('answers search-plus-category from the tag set, which is the smaller side', async () => {
      respond([
        page(
          [
            listing({ id: 'hit', title: 'Vintage vase', tags: ['art'] }),
            listing({ id: 'miss', title: 'Modern lamp', tags: ['art'] }),
            listing({
              id: 'desc-hit',
              title: 'Jug',
              description: 'vintage',
              tags: ['art'],
            }),
          ],
          { pageCount: 1, totalCount: 3 }
        ),
      ]);

      const result = await catalogPage({
        search: 'vintage',
        tag: 'art',
        activeOnly: false,
      });

      // /search ignores _tag, so asking it would mean filtering a page of the wrong set and reporting the wrong total.
      expect(urls()[0]).not.toContain('/search');
      expect(urls()[0]).toContain('_tag=art');
      expect(result.listings.map((l) => l.id)).toEqual(['hit', 'desc-hit']);
      expect(result.totalCount).toBe(2);
      expect(result.pageCount).toBe(1);
    });

    it('follows the tag set across pages before filtering', async () => {
      respond([
        page([listing({ id: 'a', title: 'vintage a', tags: ['art'] })], {
          pageCount: 2,
          totalCount: 120,
        }),
        page([listing({ id: 'b', title: 'vintage b', tags: ['art'] })], {
          pageCount: 2,
          totalCount: 120,
        }),
      ]);

      const result = await catalogPage({ search: 'vintage', tag: 'art' });

      expect(urls()).toHaveLength(2);
      expect(urls()[1]).toContain('page=2');
      expect(result.listings.map((l) => l.id)).toEqual(['a', 'b']);
      expect(result.totalCount).toBe(2);
    });

    it('never sends an empty q, which the search endpoint rejects', async () => {
      await catalogPage({ search: '   ' });

      expect(urls()[0]).not.toContain('/search');
      expect(urls()[0]).not.toContain('q=');
    });

    it('searches the active pool in memory when active-only is on', async () => {
      respond([
        page([
          listing({ id: 'match', title: 'Vintage vase' }),
          listing({ id: 'miss', title: 'Modern lamp' }),
          listing({
            id: 'desc-match',
            title: 'Jug',
            description: 'a vintage piece',
          }),
        ]),
      ]);

      const result = await catalogPage({ search: 'vintage', activeOnly: true });

      // F-012: /search ignores _active, so the small side gets filtered instead.
      expect(urls()[0]).not.toContain('/search');
      expect(urls()[0]).toContain('_active=true');
      expect(result.listings.map((l) => l.id)).toEqual(['match', 'desc-match']);
      expect(result.totalCount).toBe(2);
    });

    it('paginates the in-memory active search itself', async () => {
      respond([
        page([
          listing({ id: 'a', title: 'vintage a' }),
          listing({ id: 'b', title: 'vintage b' }),
          listing({ id: 'c', title: 'vintage c' }),
        ]),
      ]);

      const result = await catalogPage({
        search: 'vintage',
        activeOnly: true,
        page: 2,
        limit: 2,
      });

      expect(result.listings.map((l) => l.id)).toEqual(['c']);
      expect(result.totalCount).toBe(3);
      expect(result.pageCount).toBe(2);
    });
  });

  describe('sort vocabulary', () => {
    it('falls back to a known key rather than letting the API 500', () => {
      // F-046: an unknown sort field is a 500, not a silent ignore.
      expect(toSortKey('created')).toBe('created');
      expect(toSortKey('endsAt')).toBe('endsAt');
      expect(toSortKey('title')).toBe('title');
      expect(toSortKey('_count.bids')).toBe('created');
      expect(toSortKey(undefined)).toBe('created');
    });

    it('falls back to a known order', () => {
      expect(toSortOrder('asc')).toBe('asc');
      expect(toSortOrder('desc')).toBe('desc');
      expect(toSortOrder('sideways')).toBe('desc');
    });

    it('keeps an unknown sort out of the request', async () => {
      await catalogPage({
        sort: toSortKey('nonsense'),
        sortOrder: toSortOrder('nonsense'),
      });

      expect(urls()[0]).toContain('sort=created');
      expect(urls()[0]).not.toContain('nonsense');
    });
  });
});
