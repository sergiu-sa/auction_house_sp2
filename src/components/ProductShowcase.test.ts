import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Listing } from '../types/api';

const { newestWithImages } = vi.hoisted(() => ({ newestWithImages: vi.fn() }));
vi.mock('../api/listingQueries', () => ({ newestWithImages }));
vi.mock('../utils/logger', () => ({ logError: vi.fn() }));

const { initProductShowcase, mountProductShowcase } = await import(
  './ProductShowcase'
);

const NOW = new Date('2026-09-17T12:00:00.000Z');

function lot(id: string, bids: number, seller = `seller-${id}`): Listing {
  return {
    id,
    title: `Lot ${id}`,
    description: `About lot ${id}`,
    media: [{ url: `https://x.test/${id}.jpg`, alt: '' }],
    created: '2026-09-16T00:00:00.000Z',
    updated: '2026-09-16T00:00:00.000Z',
    // 1 day, 2 hours and 3 minutes after NOW.
    endsAt: '2026-09-18T14:03:00.000Z',
    seller: { name: seller, email: `${seller}@stud.noroff.no` },
    bids: Array.from({ length: bids }, (_, n) => ({
      id: `${id}-${n}`,
      amount: n + 1,
      created: '2026-09-16T00:00:00.000Z',
      bidder: { name: 'bidder', email: 'bidder@stud.noroff.no' },
    })),
  } as unknown as Listing;
}

function slot(section: HTMLElement, tile: string, name: string): string {
  return (
    section.querySelector(`[data-tile="${tile}"] [data-slot="${name}"]`)
      ?.textContent ?? ''
  );
}

function image(section: HTMLElement, tile: string): HTMLImageElement {
  return section.querySelector<HTMLImageElement>(`[data-tile="${tile}"] img`)!;
}

let section: HTMLElement;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  document.body.innerHTML = '<section id="product-showcase"></section>';
  section = document.getElementById('product-showcase')!;
  newestWithImages.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('mountProductShowcase', () => {
  it('writes every word on a tile from its own lot', () => {
    mountProductShowcase(section, [
      lot('a', 0, 'alice'),
      lot('b', 1, 'bob'),
      lot('c', 2, 'cat'),
    ]);

    expect(section.dataset.showcase).toBe('lots');
    expect(slot(section, 'featured', 'title')).toBe('Lot a');
    expect(slot(section, 'featured', 'time-left')).toBe('1d 2h 3m left');
    expect(slot(section, 'featured', 'byline')).toBe('@alice • No bids yet');
    expect(slot(section, 'featured', 'description')).toBe('About lot a');
    expect(slot(section, 'tile-a', 'byline')).toBe('@bob');
    expect(slot(section, 'tile-a', 'meta')).toBe('1 bid • 1d 2h 3m left');
    expect(slot(section, 'tile-b', 'meta')).toBe('2 bids • 1d 2h 3m left');
  });

  it('says a lot has ended rather than "Ended left"', () => {
    vi.setSystemTime(new Date('2026-09-19T00:00:00.000Z'));
    mountProductShowcase(section, [lot('a', 0), lot('b', 0), lot('c', 0)]);

    expect(slot(section, 'featured', 'time-left')).toBe('Ended');
  });

  it('draws the paddles, and no image at all, when there are not three lots', () => {
    mountProductShowcase(section, [lot('a', 0), lot('b', 0)]);

    expect(section.dataset.showcase).toBe('paddles');
    expect(section.querySelector('[data-tile="paddles"] svg')).not.toBeNull();
    expect(section.querySelectorAll('img')).toHaveLength(0);
  });

  it('leaves a tile image alone while its lot stays the same, and after its fallback has run', () => {
    // Re-pointing an image at its own URL restarts the load, which the fallback can mistake for a failure.
    const lots = [lot('a', 0), lot('b', 0), lot('c', 0)];
    mountProductShowcase(section, lots);
    const featured = image(section, 'featured');
    expect(featured.getAttribute('src')).toBe('https://x.test/a.jpg');

    const writes = vi.spyOn(featured, 'setAttribute');
    mountProductShowcase(section, lots);
    expect(writes).not.toHaveBeenCalled();

    // A dead photograph: the fallback swaps in the placeholder, and a refresh must not ask for the dead URL again.
    featured.dispatchEvent(new Event('error'));
    const fallback = featured.getAttribute('src');
    expect(fallback).not.toBe('https://x.test/a.jpg');
    mountProductShowcase(section, lots);
    expect(featured.getAttribute('src')).toBe(fallback);

    mountProductShowcase(section, [lot('z', 0), lots[1], lots[2]]);
    expect(featured.getAttribute('src')).toBe('https://x.test/z.jpg');
  });
});

describe('initProductShowcase', () => {
  it('draws the paddles when the first fetch fails', async () => {
    newestWithImages.mockRejectedValue(new Error('offline'));

    await initProductShowcase();

    expect(section.dataset.showcase).toBe('paddles');
  });

  it('keeps the lots on screen when a later refresh fails or comes back short', async () => {
    newestWithImages.mockResolvedValueOnce([
      lot('a', 0),
      lot('b', 0),
      lot('c', 0),
    ]);
    await initProductShowcase();
    expect(section.dataset.showcase).toBe('lots');

    newestWithImages.mockRejectedValueOnce(new Error('offline'));
    await vi.advanceTimersByTimeAsync(15000);
    expect(section.dataset.showcase).toBe('lots');

    newestWithImages.mockResolvedValueOnce([lot('d', 0)]);
    await vi.advanceTimersByTimeAsync(15000);
    expect(section.dataset.showcase).toBe('lots');
    expect(slot(section, 'featured', 'title')).toBe('Lot a');
  });

  it('ignores a refresh that answers after a newer one', async () => {
    // A request that stalls past the next tick lands second, and would put older lots back on screen.
    newestWithImages.mockResolvedValueOnce([
      lot('a', 0),
      lot('b', 0),
      lot('c', 0),
    ]);
    await initProductShowcase();

    let answerLate: (lots: Listing[]) => void = () => {};
    newestWithImages.mockReturnValueOnce(
      new Promise<Listing[]>((resolve) => {
        answerLate = resolve;
      })
    );
    await vi.advanceTimersByTimeAsync(15000);

    newestWithImages.mockResolvedValueOnce([
      lot('new', 0),
      lot('b', 0),
      lot('c', 0),
    ]);
    await vi.advanceTimersByTimeAsync(15000);
    expect(slot(section, 'featured', 'title')).toBe('Lot new');

    answerLate([lot('stale', 0), lot('b', 0), lot('c', 0)]);
    await vi.advanceTimersByTimeAsync(0);
    expect(slot(section, 'featured', 'title')).toBe('Lot new');
  });

  it('still updates when every refresh is slower than the interval', async () => {
    // Each answer arrives after the next request has started, so "only the newest request may draw" would throw all of them away.
    newestWithImages.mockResolvedValueOnce([
      lot('a', 0),
      lot('b', 0),
      lot('c', 0),
    ]);
    await initProductShowcase();

    newestWithImages.mockImplementation(
      () =>
        new Promise<Listing[]>((resolve) =>
          setTimeout(
            () => resolve([lot('slow', 0), lot('b', 0), lot('c', 0)]),
            20000
          )
        )
    );
    await vi.advanceTimersByTimeAsync(40000);

    expect(slot(section, 'featured', 'title')).toBe('Lot slow');
  });

  it('lets a slow refresh with lots replace the paddles when a quicker one failed in between', async () => {
    // A failure while the paddles show draws nothing, so it must not count as drawn and block the older answer.
    newestWithImages.mockResolvedValueOnce([]);
    await initProductShowcase();
    expect(section.dataset.showcase).toBe('paddles');

    newestWithImages.mockImplementationOnce(
      () =>
        new Promise<Listing[]>((resolve) =>
          setTimeout(
            () => resolve([lot('a', 0), lot('b', 0), lot('c', 0)]),
            20000
          )
        )
    );
    newestWithImages.mockRejectedValueOnce(new Error('offline'));
    newestWithImages.mockResolvedValue([]);
    await vi.advanceTimersByTimeAsync(36000);

    expect(section.dataset.showcase).toBe('lots');
  });

  it('swaps the paddles for lots once there are lots to show', async () => {
    newestWithImages.mockResolvedValueOnce([]);
    await initProductShowcase();
    expect(section.dataset.showcase).toBe('paddles');

    newestWithImages.mockResolvedValueOnce([
      lot('a', 0),
      lot('b', 0),
      lot('c', 0),
    ]);
    await vi.advanceTimersByTimeAsync(15000);
    expect(section.dataset.showcase).toBe('lots');
    expect(slot(section, 'featured', 'title')).toBe('Lot a');
  });
});
