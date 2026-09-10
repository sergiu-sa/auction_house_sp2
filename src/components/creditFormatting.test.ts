import { describe, it, expect } from 'vitest';
import type { Bid, Listing } from '../types/api';
import { createCollectionCard } from './CollectionCard';
import { createProductCard } from './ProductCard';
import { createQuickCard } from './QuickCard';
import { renderFeaturedWin } from './FeaturedWin';
import { formatCredits } from '../utils/formatCurrency';

/**
 * One amount, every card that can show it.
 *
 * Three implementations of this used to coexist;
 * `formatCurrency`, an inline `Intl.NumberFormat` written out at 18 sites, and bare interpolation at 6;
 *  and two of them rendered the same lot on the same screen as `1,002 credits` and `1002 credits`.
 * Asserting the grouped figure per surface is what stops a new card reintroducing the ungrouped one.
 *
 * The bare figure is what to look for, not the whole phrase:
 *  each surface pairs it with its own label, and those differ by design.
 */
const AMOUNT = 1002;
const GROUPED = formatCredits(AMOUNT);

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
    _count: { bids: 1 },
    bids: [
      {
        id: 'bid-1',
        amount: AMOUNT,
        created: '2026-08-02T00:00:00.000Z',
        bidder: { name: 'Someone' },
      } as unknown as Bid,
    ],
  } as unknown as Listing;
}

describe('a credit amount is grouped on every surface that renders one', () => {
  it('formatCredits groups it in the first place', () => {
    expect(GROUPED).toBe('1,002');
  });

  const surfaces: Array<[string, () => string]> = [
    ['CollectionCard, grid', () => createCollectionCard(listing(), 'grid')],
    ['CollectionCard, list', () => createCollectionCard(listing(), 'list')],
    ['ProductCard', () => createProductCard(listing())],
    ['QuickCard', () => createQuickCard(listing())],
    [
      'FeaturedWin',
      () =>
        renderFeaturedWin({
          lotNumber: '789',
          title: 'A lot',
          finalPrice: AMOUNT,
          bidCount: 1,
          description: 'Something',
          winner: { username: 'Someone', verified: true },
          isUserWin: false,
          isEnded: true,
        }),
    ],
  ];

  for (const [name, render] of surfaces) {
    it(`${name} prints ${GROUPED}, never ${AMOUNT}`, () => {
      const html = render();
      expect(html).toContain(GROUPED);
      // The ungrouped figure must not survive anywhere a reader can see it.
      // The bounded match is what keeps `1,002` from counting as a hit; the fixture's id and bid count contain no `1002` of their own, so nothing else in the markup can satisfy it.
      expect(html).not.toMatch(new RegExp(`(^|[^,\\d])${AMOUNT}([^\\d]|$)`));
    });
  }
});
