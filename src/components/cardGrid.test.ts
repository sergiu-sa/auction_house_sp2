import { describe, it, expect, vi } from 'vitest';
import type { Listing } from '../types/api';
import { renderCardGrid, showCardSkeletons } from './cardGrid';
import { renderProductCards, showProductCardSkeletons } from './ProductCard';
import { renderQuickCards, showQuickCardSkeletons } from './QuickCard';
import {
  renderCollectionCards,
  showCollectionCardSkeletons,
} from './CollectionCard';

function container(id: string): HTMLElement {
  document.body.innerHTML = `<div id="${id}"></div>`;
  return document.getElementById(id) as HTMLElement;
}

function listing(id: string): Listing {
  return {
    id,
    title: `Lot ${id}`,
    description: 'Something',
    tags: ['general'],
    media: [{ url: 'https://example.invalid/a.jpg', alt: 'a' }],
    created: '2026-08-01T00:00:00.000Z',
    updated: '2026-08-01T00:00:00.000Z',
    endsAt: '2099-01-01T00:00:00.000Z',
    _count: { bids: 1 },
    bids: [],
  } as unknown as Listing;
}

describe('renderCardGrid', () => {
  it('writes one card per lot and binds after the write', () => {
    const host = container('grid');
    const bind = vi.fn((el: HTMLElement) => {
      // The binder must see the cards, not an empty container.
      expect(el.querySelectorAll('article')).toHaveLength(2);
    });

    renderCardGrid({
      containerId: 'grid',
      listings: [listing('a'), listing('b')],
      card: (l) => `<article data-id="${l.id}"></article>`,
      empty: '<p>none</p>',
      bind,
    });

    expect(host.querySelectorAll('article')).toHaveLength(2);
    expect(bind).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state instead, and does not bind', () => {
    const host = container('grid');
    const bind = vi.fn();

    renderCardGrid({
      containerId: 'grid',
      listings: [],
      card: () => '<article></article>',
      empty: '<p>none</p>',
      bind,
    });

    expect(host.textContent).toContain('none');
    expect(bind).not.toHaveBeenCalled();
  });

  it('does nothing when the container is missing', () => {
    document.body.innerHTML = '';
    expect(() =>
      renderCardGrid({
        containerId: 'absent',
        listings: [listing('a')],
        card: () => '<article></article>',
        empty: '',
      })
    ).not.toThrow();
  });
});

describe('showCardSkeletons', () => {
  it('repeats the skeleton exactly count times', () => {
    const host = container('grid');
    showCardSkeletons('grid', 5, () => '<div class="sk"></div>');
    expect(host.querySelectorAll('.sk')).toHaveLength(5);
  });
});

/**
 * The property the consolidation exists for. Three modules used to carry their own copy of
 * "write these into that container"; if one is ever rewritten by hand again, the shared behaviour
 * below is what stops it drifting silently.
 */
describe('every lot grid goes through the one driver', () => {
  const grids: Array<
    [string, (n: number, id: string) => void, (id: string) => void]
  > = [
    [
      'product-cards-grid',
      (n, id) => showProductCardSkeletons(n, id),
      (id) => renderProductCards([listing('a')], id),
    ],
    [
      'quick-cards-grid',
      (n, id) => showQuickCardSkeletons(n, id),
      (id) => renderQuickCards([listing('a')], id),
    ],
    [
      'collection-cards-grid',
      (n, id) => showCollectionCardSkeletons(n, id),
      (id) => renderCollectionCards([listing('a')], id),
    ],
  ];

  for (const [id, skeletons, render] of grids) {
    it(`${id}: renders a card, and arms its lot image`, () => {
      const host = container(id);
      render(id);

      expect(host.querySelectorAll('article')).toHaveLength(1);
      expect(host.querySelector('[data-lot-image]')).not.toBeNull();
    });

    it(`${id}: repeats its own skeleton, not another card's`, () => {
      const host = container(id);
      skeletons(3, id);

      expect(host.querySelectorAll('.animate-pulse')).toHaveLength(3);
      expect(host.querySelectorAll('article')).toHaveLength(0);
    });
  }
});
