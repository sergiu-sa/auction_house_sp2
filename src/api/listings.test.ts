import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getListings } from './listings';

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
    await getListings({ limit: 50, sort: 'created', sortOrder: 'desc', _active: true });

    expect(requestedUrl()).toContain('_active=true');
  });

  it('should not ask for active listings when _active is omitted', async () => {
    await getListings({ limit: 50, sort: 'created', sortOrder: 'desc' });

    expect(requestedUrl()).not.toContain('_active');
  });
});
