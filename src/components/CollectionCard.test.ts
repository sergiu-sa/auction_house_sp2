import { describe, it, expect } from 'vitest';
import type { Listing } from '../types/api';
import {
  createCollectionCard,
  createCollectionCardSkeleton,
} from './CollectionCard';

/**
 * The card and its skeleton are two hand-written copies of the same shape, so they drift.
 * They already did:
 *  the list skeleton kept `aspect-[3/2]` below `sm` while the card it stands in for is `aspect-square` there, and the row grew 142px the moment real data landed.
 */

function listing(): Listing {
  return {
    id: 'abcdef01-2345-6789-abcd-ef0123456789',
    title: 'A lot',
    description: 'Something',
    tags: ['general'],
    media: [{ url: 'https://example.invalid/a.jpg', alt: 'a' }],
    created: '2026-08-01T00:00:00.000Z',
    updated: '2026-08-01T00:00:00.000Z',
    endsAt: '2099-01-01T00:00:00.000Z',
    _count: { bids: 2 },
    bids: [],
  } as unknown as Listing;
}

/** The media box is the first element carrying an aspect or a fixed track size. */
function mediaClasses(html: string): string[] {
  const match = html.match(/class="([^"]*\baspect-[^"]*)"/);
  return (match?.[1] ?? '').split(/\s+/).filter(Boolean);
}

describe('skeleton parity with the card it stands in for', () => {
  for (const viewMode of ['grid', 'list'] as const) {
    it(`${viewMode} view: the media box is sized the same at every breakpoint`, () => {
      const card = mediaClasses(createCollectionCard(listing(), viewMode));
      const skeleton = mediaClasses(createCollectionCardSkeleton(viewMode));

      const sizing = (classes: string[]): string[] =>
        classes.filter((c) => /(^|:)(aspect-|h-|w-)/.test(c)).sort();

      expect(card.length).toBeGreaterThan(0);
      expect(sizing(skeleton)).toEqual(sizing(card));
    });

    it(`${viewMode} view: the card and skeleton stack the same way`, () => {
      const card = createCollectionCard(listing(), viewMode);
      const skeleton = createCollectionCardSkeleton(viewMode);
      const stacks = /\bflex-col sm:flex-row\b/;

      expect(stacks.test(skeleton)).toBe(stacks.test(card));
    });
  }
});
