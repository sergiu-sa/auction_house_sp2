import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Listing } from '../types/api';
import type { ImageProbe } from '../utils/imageProbe';

// vi.mock is hoisted above every const, so the spy has to be hoisted with it.
const { probeImages } = vi.hoisted(() => ({ probeImages: vi.fn() }));
vi.mock('../utils/imageProbe', () => ({ probeImages }));

const { featuredWithImages, newestWithImages } = await import(
  './listingQueries'
);

/** Only the fields the hero's ranking reads are real. */
function lot(
  id: string,
  bids: number,
  url = `https://x.test/${id}.jpg`
): Listing {
  return {
    id,
    title: `Lot ${id}`,
    media: url ? [{ url, alt: '' }] : [],
    _count: { bids },
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
    endsAt: '2099-01-01T00:00:00.000Z',
  } as unknown as Listing;
}

/** Answer each probed url from a map; anything unlisted is dead. */
function answering(
  table: Record<string, { width: number; height: number }>
): void {
  probeImages.mockImplementation(async (urls: string[]) =>
    urls.map((url): ImageProbe => {
      const hit = table[url];
      return hit
        ? {
            url,
            ok: true,
            width: hit.width,
            height: hit.height,
            timedOut: false,
          }
        : { url, ok: false, width: 0, height: 0, timedOut: false };
    })
  );
}

const SQUARE = { width: 1000, height: 1000 };
const WIDE = { width: 1200, height: 800 };

// Block body: a hook returning a function is treated as teardown.
beforeEach(() => {
  probeImages.mockReset();
});

describe('featuredWithImages', () => {
  it('skips the highest-bid lots when their photographs will not load', async () => {
    // The live case: the two most-bid lots are from a seller whose image host 404s.
    const pool = [
      lot('dead1', 16),
      lot('dead2', 7),
      lot('a', 6),
      lot('b', 5),
      lot('c', 4),
    ];
    answering({
      'https://x.test/a.jpg': SQUARE,
      'https://x.test/b.jpg': SQUARE,
      'https://x.test/c.jpg': SQUARE,
    });

    const featured = await featuredWithImages(3, pool);

    expect(featured.map((l) => l.id)).toEqual(['a', 'b', 'c']);
  });

  it('keeps bid order among the lots it does show', async () => {
    const pool = [lot('a', 9), lot('b', 8), lot('c', 7)];
    answering({
      'https://x.test/a.jpg': SQUARE,
      'https://x.test/b.jpg': SQUARE,
      'https://x.test/c.jpg': SQUARE,
    });

    expect((await featuredWithImages(3, pool)).map((l) => l.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('puts the widest photograph in the main tile, not merely the largest', async () => {
    // The main tile is roughly 3:1.
    // A 1200x1200 is large but square, so it is cropped hard there.
    const pool = [lot('square', 9), lot('wide', 8), lot('alsobig', 7)];
    answering({
      'https://x.test/square.jpg': { width: 1200, height: 1200 },
      'https://x.test/wide.jpg': { width: 1740, height: 1160 },
      'https://x.test/alsobig.jpg': { width: 900, height: 900 },
    });

    expect((await featuredWithImages(3, pool))[0].id).toBe('wide');
  });

  it('drops behind a bigger photograph a lot whose image would be upscaled', async () => {
    // 400px in a hero tile is visibly soft.
    // It still appears, just not ahead of a sharp one.
    const pool = [lot('tall', 9), lot('wide', 8), lot('square', 7)];
    answering({
      'https://x.test/tall.jpg': { width: 400, height: 900 },
      'https://x.test/wide.jpg': WIDE,
      'https://x.test/square.jpg': SQUARE,
    });

    expect((await featuredWithImages(3, pool)).map((l) => l.id)).toEqual([
      'wide',
      'square',
      'tall',
    ]);
  });

  it('leaves the order alone when the top lot is already the widest', async () => {
    const pool = [lot('a', 9), lot('b', 8), lot('c', 7)];
    answering({
      'https://x.test/a.jpg': WIDE,
      'https://x.test/b.jpg': WIDE,
      'https://x.test/c.jpg': SQUARE,
    });

    expect((await featuredWithImages(3, pool)).map((l) => l.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('returns fewer lots rather than padding the hero with a placeholder', async () => {
    const pool = [lot('a', 9), lot('dead', 8), lot('dead2', 7)];
    answering({ 'https://x.test/a.jpg': SQUARE });

    expect((await featuredWithImages(3, pool)).map((l) => l.id)).toEqual(['a']);
  });

  it('probes further down the ranking when a whole wave is dead', async () => {
    const pool = Array.from({ length: 12 }, (_, i) => lot(`l${i}`, 20 - i));
    answering({
      'https://x.test/l9.jpg': SQUARE,
      'https://x.test/l10.jpg': SQUARE,
      'https://x.test/l11.jpg': SQUARE,
    });

    const featured = await featuredWithImages(3, pool);

    expect(featured.map((l) => l.id)).toEqual(['l9', 'l10', 'l11']);
    expect(probeImages.mock.calls.length).toBeGreaterThan(1);
  });

  it('asks about only a few candidates when the first ones load', async () => {
    // The winners are cached by the probe, so the only cost is the candidates that lose.
    const pool = Array.from({ length: 40 }, (_, i) => lot(`l${i}`, 40 - i));
    answering(Object.fromEntries(pool.map((l) => [l.media![0].url, SQUARE])));

    await featuredWithImages(3, pool);

    expect(probeImages).toHaveBeenCalledTimes(1);
    expect(probeImages.mock.calls[0][0]).toHaveLength(5);
  });

  it('keeps the top-ranked lots when the budget runs out rather than striking them off', async () => {
    // Timeout: don't demote top lots; unknown is better than "fastest host".
    const pool = Array.from({ length: 10 }, (_, i) => lot(`l${i}`, 20 - i));
    const clock = vi.spyOn(Date, 'now');
    let elapsed = 0;
    clock.mockImplementation(() => elapsed);

    probeImages.mockImplementation(async (urls: string[]) => {
      elapsed += 3000; // over the budget, so no second wave is started
      return urls.map(
        (url): ImageProbe => ({
          url,
          ok: false,
          width: 0,
          height: 0,
          timedOut: true,
        })
      );
    });

    const featured = await featuredWithImages(3, pool);
    clock.mockRestore();

    expect(probeImages).toHaveBeenCalledTimes(1);
    expect(featured.map((l) => l.id)).toEqual(['l0', 'l1', 'l2']);
  });

  it('starts no wave it has no time to hear back from', async () => {
    // Timeout is a macrotask; no time left = no wave issued.
    const pool = Array.from({ length: 10 }, (_, i) => lot(`l${i}`, 20 - i));
    const clock = vi.spyOn(Date, 'now');
    let elapsed = 0;
    clock.mockImplementation(() => elapsed);

    probeImages.mockImplementation(async (urls: string[]) => {
      elapsed += 2400; // 100ms of budget left: not enough to try again
      return urls.map(
        (url): ImageProbe => ({
          url,
          ok: false,
          width: 0,
          height: 0,
          timedOut: true,
        })
      );
    });

    await featuredWithImages(3, pool);
    clock.mockRestore();

    expect(probeImages).toHaveBeenCalledTimes(1);
  });

  it('shows the ranking rather than an empty hero if every candidate is dead', async () => {
    const pool = [lot('a', 9), lot('b', 8), lot('c', 7)];
    answering({});

    expect((await featuredWithImages(3, pool)).map((l) => l.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('does not treat a lot with no media as a candidate', async () => {
    const pool = [lot('none', 9, ''), lot('a', 8)];
    answering({ 'https://x.test/a.jpg': SQUARE });

    expect((await featuredWithImages(3, pool)).map((l) => l.id)).toEqual(['a']);
  });
});

describe('featuredWithImages — probing cost', () => {
  it('asks a resizing CDN for a small variant, not the original', async () => {
    // Probe the variant the browser will load from srcset, not the original.
    const pool = [
      lot('cdn', 9, 'https://images.unsplash.com/photo-1?q=80&w=1740'),
      lot('own', 8, 'https://seller.test/lot.jpg'),
    ];
    probeImages.mockResolvedValue([
      { url: '', ok: true, width: 400, height: 267, timedOut: false },
      { url: '', ok: true, width: 900, height: 900, timedOut: false },
    ]);

    await featuredWithImages(2, pool);

    expect(probeImages.mock.calls[0][0]).toEqual([
      'https://images.unsplash.com/photo-1?w=400&q=80&w=1740',
      'https://seller.test/lot.jpg',
    ]);
  });

  it('does not treat a small CDN variant as a small photograph', async () => {
    // 400w variant is by design; don't demote CDN lots as small photos.
    const pool = [
      lot('cdn', 9, 'https://images.unsplash.com/photo-1'),
      lot('small', 8, 'https://seller.test/tiny.jpg'),
      lot('big', 7, 'https://seller.test/big.jpg'),
    ];
    probeImages.mockResolvedValue([
      { url: '', ok: true, width: 400, height: 400, timedOut: false },
      { url: '', ok: true, width: 300, height: 300, timedOut: false },
      { url: '', ok: true, width: 1000, height: 1000, timedOut: false },
    ]);

    const featured = await featuredWithImages(3, pool);

    // 'small' is the only genuinely soft one, so it is the only one demoted.
    expect(featured.map((l) => l.id)).toEqual(['cdn', 'big', 'small']);
  });
});

describe('newestWithImages', () => {
  const fetchMock = vi.fn();

  function serve(data: Listing[]): void {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data, meta: { pageCount: 1 } }),
    });
    vi.stubGlobal('fetch', fetchMock);
  }

  function created(listing: Listing, at: string): Listing {
    return { ...listing, created: at };
  }

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('asks for the newest active lots, deep enough to skip a run without photographs', async () => {
    serve([]);
    answering({});

    await newestWithImages(3);

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('/auction/listings?');
    expect(url).toContain('limit=20');
    expect(url).toContain('sort=created');
    expect(url).toContain('sortOrder=desc');
    expect(url).toContain('_active=true');
    expect(url).toContain('_seller=true');
    expect(url).toContain('_bids=true');
  });

  it('passes over the newest lots when they have no photograph that loads', async () => {
    // The live case on 2026-09-17: the two newest lots carried no media at all.
    serve([
      created(lot('bare1', 0, ''), '2026-09-15T18:39:00.000Z'),
      created(lot('bare2', 0, ''), '2026-09-15T18:37:00.000Z'),
      created(lot('dead', 0), '2026-09-14T00:00:00.000Z'),
      created(lot('a', 0), '2026-09-13T18:25:00.000Z'),
      created(lot('b', 0), '2026-09-13T18:24:00.000Z'),
      created(lot('c', 0), '2026-09-13T18:21:00.000Z'),
    ]);
    answering({
      'https://x.test/a.jpg': SQUARE,
      'https://x.test/b.jpg': SQUARE,
      'https://x.test/c.jpg': SQUARE,
    });

    expect((await newestWithImages(3)).map((l) => l.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('never offers a lot with no photograph, even when the budget runs out and unchecked lots fill the rest', async () => {
    // Slow 4G: the first wave times out, no second wave starts, and the fill tops up from the ranking.
    // It skips lots it probed dead, but a photo-less lot past the first wave was never probed, so it used to get in and paint the placeholder.
    serve([
      created(lot('a', 0), '2026-09-17T06:00:00.000Z'),
      created(lot('b', 0), '2026-09-17T05:00:00.000Z'),
      created(lot('bare1', 0, ''), '2026-09-17T04:00:00.000Z'),
      created(lot('bare2', 0, ''), '2026-09-17T03:00:00.000Z'),
      created(lot('bare3', 0, ''), '2026-09-17T02:00:00.000Z'),
      created(lot('bare4', 0, ''), '2026-09-17T01:00:00.000Z'),
    ]);
    const clock = vi.spyOn(Date, 'now');
    let elapsed = 0;
    clock.mockImplementation(() => elapsed);
    probeImages.mockImplementation(async (urls: string[]) => {
      elapsed += 3000;
      return urls.map(
        (url): ImageProbe => ({
          url,
          ok: false,
          width: 0,
          height: 0,
          timedOut: url !== '',
        })
      );
    });

    const ids = (await newestWithImages(3)).map((l) => l.id);
    clock.mockRestore();

    // The two slow photographs still count; unknown is not dead.
    expect(ids).toEqual(['a', 'b']);
  });

  it('returns fewer lots rather than falling back to ones it knows are broken', async () => {
    // The hero shows its ranking when nothing verifies; the showcase must not, or it paints placeholders.
    serve([
      created(lot('a', 0), '2026-09-13T00:00:00.000Z'),
      created(lot('dead', 0), '2026-09-12T00:00:00.000Z'),
      created(lot('bare', 0, ''), '2026-09-11T00:00:00.000Z'),
    ]);
    answering({ 'https://x.test/a.jpg': SQUARE });

    expect((await newestWithImages(3)).map((l) => l.id)).toEqual(['a']);
  });
});
