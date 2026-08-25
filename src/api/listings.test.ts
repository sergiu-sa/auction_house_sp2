import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getListings, searchListings } from './listings';

const fetchMock = vi.fn();

function requestedUrl(): string {
  return fetchMock.mock.calls[0][0] as string;
}

describe('getListings', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [], meta: {} }),
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should ask the API for active listings only when _active is set', async () => {
    await getListings({
      limit: 50,
      sort: 'created',
      sortOrder: 'desc',
      _active: true,
    });

    expect(requestedUrl()).toContain('_active=true');
  });

  it('should not ask for active listings when _active is omitted', async () => {
    await getListings({ limit: 50, sort: 'created', sortOrder: 'desc' });

    expect(requestedUrl()).not.toContain('_active');
  });

  it('should pass a category through as the server tag filter', async () => {
    await getListings({ limit: 24, _tag: 'art' });

    expect(requestedUrl()).toContain('_tag=art');
  });

  it('should ask for a specific page', async () => {
    await getListings({ limit: 24, page: 4 });

    expect(requestedUrl()).toContain('page=4');
  });
});

describe('searchListings', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [], meta: {} }),
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // getListings used to accept a `search` param and append q= to /auction/listings, which the API ignores: it answered with the whole pool as if everything matched.
  it('should use the endpoint that actually honours q', async () => {
    await searchListings({ q: 'vintage' });

    expect(requestedUrl()).toContain('/auction/listings/search?');
    expect(requestedUrl()).toContain('q=vintage');
  });

  it('should encode a term that would otherwise break the query string', async () => {
    await searchListings({ q: 'art & crafts' });

    expect(requestedUrl()).toContain('q=art+%26+crafts');
  });

  it('should paginate and sort server-side', async () => {
    await searchListings({
      q: 'vintage',
      page: 2,
      limit: 24,
      sort: 'endsAt',
      sortOrder: 'asc',
    });

    const url = requestedUrl();
    expect(url).toContain('page=2');
    expect(url).toContain('limit=24');
    expect(url).toContain('sort=endsAt');
    expect(url).toContain('sortOrder=asc');
  });
});
