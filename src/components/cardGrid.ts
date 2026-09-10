/**
 * The driver behind every grid of lot cards.
 *
 * Three modules had written it out: `renderXCards`, `attachXEvents` and `showXSkeletons`, once
 * each for the catalog card, the featured card and the compact one. Measured on normalised lines,
 * `attachProductCardEvents` and `attachQuickCardEvents` were **26 of 29 identical** — the
 * differences were the function name, a default container id, and one word inside a log message.
 *
 * What is genuinely per-card is the markup and the empty-state copy, and those stay where they
 * are. What is not is "write these into that container, arm the images, bind the controls".
 */

import type { Listing } from '../types/api';
import { isLoggedIn } from '../utils/auth';
import { logError } from '../utils/logger';
import { initLotImageFallbacks } from '../utils/listingImage';
import { toast } from './Toast';

export interface CardGridConfig {
  containerId: string;
  listings: Listing[];
  /** One lot's markup. */
  card: (listing: Listing) => string;
  /** What the grid shows instead when there are none. */
  empty: string;
  /** Bind whatever controls this grid's cards carry. Runs after the write, before paint. */
  bind?: (container: HTMLElement) => void;
}

export function renderCardGrid({
  containerId,
  listings,
  card,
  empty,
  bind,
}: CardGridConfig): void {
  const container = document.getElementById(containerId);
  if (!container) {
    logError(`Container with id "${containerId}" not found`);
    return;
  }

  if (listings.length === 0) {
    container.innerHTML = empty;
    return;
  }

  // Called through an arrow, not passed to `map` directly: `map` hands its callback
  // `(item, index, array)`, so a factory that later grows an optional second parameter — the
  // shape `createCollectionCard` already has — would silently receive the index as that argument.
  container.innerHTML = listings.map((listing) => card(listing)).join('');
  initLotImageFallbacks(container);
  bind?.(container);
}

export function showCardSkeletons(
  containerId: string,
  count: number,
  skeleton: () => string
): void {
  const container = document.getElementById(containerId);
  if (!container) {
    logError(`Container with id "${containerId}" not found`);
    return;
  }

  // Same reason as above: `Array.from` passes `(undefined, index)` to its mapper.
  container.innerHTML = Array.from({ length: count }, () => skeleton()).join(
    ''
  );
}

/**
 * The "Place Bid" control the featured and compact cards share.
 *
 * It sends a guest to log in before the lot; the catalog card's "View & Bid" does not, and goes
 * straight there. That divergence is deliberate here only in the sense that it is preserved —
 * three cards carry two policies and nothing in the codebase states which is intended.
 */
export function bindPlaceBidButtons(container: HTMLElement): void {
  const buttons = container.querySelectorAll<HTMLButtonElement>(
    '[data-action="place-bid"]'
  );

  buttons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const listingId = button.getAttribute('data-listing-id');

      if (!listingId) {
        logError('Place-bid button missing data-listing-id');
        return;
      }

      if (!isLoggedIn()) {
        toast.error('Please log in to place a bid');
        setTimeout(() => {
          window.location.href = `/login.html?redirect=/listing.html?id=${listingId}`;
        }, 1500);
        return;
      }

      window.location.href = `/listing.html?id=${listingId}`;
    });
  });
}
