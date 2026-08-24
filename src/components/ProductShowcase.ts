/**
 * Shared product showcase used on the login and register pages.
 *
 * Both auth pages render three `data-tile` panels in their HTML
 * (`featured`, `tile-a`, `tile-b`). This module fetches the latest listings
 * and pours them into those panels, refreshing every 15 seconds. The exact
 * fields each tile shows differ between login and register — the config
 * object below holds the per-page differences.
 */

import { getListings } from '../api/listings';
import { formatTimeRemaining } from '../utils/formatDate';
import { logError } from '../utils/logger';
import type { Listing } from '../types/api';

const REFRESH_INTERVAL_MS = 15000;
const FEATURED_FETCH_LIMIT = 3;

export interface ProductShowcaseConfig {
  /** Used in error log context only. */
  pageName: 'login' | 'register';
  /** Fallback hero images for each tile if the API media URL fails to load. */
  fallbackImages: {
    featured: string;
    tileA: string;
    tileB: string;
  };
  /** Character cap for the description on the featured tile. */
  featuredDescriptionLength: number;
  /** When true, write the highest bid into `#featured-bid` on the featured tile. */
  showFeaturedBid: boolean;
  /** Title char cap on tile-a. */
  tileATitleMaxLength: number;
  /** Title char cap on tile-b. */
  tileBTitleMaxLength: number;
  /** When true, populate `#watch-bids` and `#watch-time` on tile-a. */
  showTileABidAndTime: boolean;
  /** When true, write a truncated description into tile-b's `.text-[11px].text-slate-600` slot. */
  showTileBDescription: boolean;
  /** Character cap for tile-b's description. Ignored unless `showTileBDescription`. */
  tileBDescriptionLength: number;
}

/**
 * Fetch listings and update the showcase tiles. Runs once on init and then
 * on a 15-second interval. Network failures are logged but do not surface to
 * the user — the page keeps whatever was last rendered.
 */
export async function initProductShowcase(
  config: ProductShowcaseConfig
): Promise<void> {
  await loadDynamicListings(config);

  setInterval(() => {
    loadDynamicListings(config);
  }, REFRESH_INTERVAL_MS);
}

async function loadDynamicListings(
  config: ProductShowcaseConfig
): Promise<void> {
  try {
    const response = await getListings({
      limit: FEATURED_FETCH_LIMIT,
      _bids: true,
      sort: 'created',
      sortOrder: 'desc',
    });

    if (response.data && response.data.length > 0) {
      updateShowcase(response.data, config);
    }
  } catch (error) {
    logError(
      `Failed to load dynamic listings on ${config.pageName} page`,
      error
    );
  }
}

function updateShowcase(
  listings: Listing[],
  config: ProductShowcaseConfig
): void {
  if (listings[0]) {
    updateFeaturedTile(listings[0], config);
  }
  if (listings[1]) {
    updateSmallTile(listings[1], 'tile-a', config);
  }
  if (listings[2]) {
    updateSmallTile(listings[2], 'tile-b', config);
  }
}

function updateFeaturedTile(
  listing: Listing,
  config: ProductShowcaseConfig
): void {
  const article = document.querySelector(
    '[data-tile="featured"]'
  ) as HTMLElement | null;
  if (!article) return;

  const img = article.querySelector('img') as HTMLImageElement | null;
  if (img && listing.media && listing.media.length > 0) {
    img.src = listing.media[0].url;
    img.alt = listing.media[0].alt || listing.title;
    img.onerror = () => {
      img.src = config.fallbackImages.featured;
    };
  }

  const titleElement = article.querySelector(
    '.font-serif'
  ) as HTMLElement | null;
  if (titleElement) {
    titleElement.textContent = listing.title;
  }

  const descElement = article.querySelector(
    '.text-xs.text-slate-600'
  ) as HTMLElement | null;
  if (descElement && listing.description) {
    descElement.textContent =
      listing.description.substring(0, config.featuredDescriptionLength) +
      '...';
  }

  if (config.showFeaturedBid) {
    const bidElement = article.querySelector(
      '#featured-bid'
    ) as HTMLElement | null;
    if (bidElement && listing.bids && listing.bids.length > 0) {
      const highestBid = Math.max(...listing.bids.map((bid) => bid.amount));
      bidElement.textContent = highestBid.toString();
    }
  }
}

function updateSmallTile(
  listing: Listing,
  tileId: 'tile-a' | 'tile-b',
  config: ProductShowcaseConfig
): void {
  const article = document.querySelector(
    `[data-tile="${tileId}"]`
  ) as HTMLElement | null;
  if (!article) return;

  const img = article.querySelector('img') as HTMLImageElement | null;
  if (img && listing.media && listing.media.length > 0) {
    img.src = listing.media[0].url;
    img.alt = listing.media[0].alt || listing.title;
    img.onerror = () => {
      img.src =
        tileId === 'tile-a'
          ? config.fallbackImages.tileA
          : config.fallbackImages.tileB;
    };
  }

  const titleElement = article.querySelector(
    '.text-xs.font-semibold'
  ) as HTMLElement | null;
  if (titleElement) {
    const cap =
      tileId === 'tile-a'
        ? config.tileATitleMaxLength
        : config.tileBTitleMaxLength;
    titleElement.textContent =
      listing.title.length > cap
        ? listing.title.substring(0, cap) + '...'
        : listing.title;
  }

  if (tileId === 'tile-a' && config.showTileABidAndTime) {
    const watchBids = article.querySelector(
      '#watch-bids'
    ) as HTMLElement | null;
    const watchTime = article.querySelector(
      '#watch-time'
    ) as HTMLElement | null;

    if (watchBids && listing.bids) {
      watchBids.textContent = listing.bids.length.toString();
    }

    if (watchTime && listing.endsAt) {
      watchTime.textContent = formatTimeRemaining(listing.endsAt);
    }
  }

  // The register page renders combined "X bids · Yh Zm left" text into the
  // `.text-[11px].text-slate-600` slot — login uses the slot for description
  // text instead. Each page tells us which to do via its config.
  if (tileId === 'tile-a' && !config.showTileABidAndTime) {
    const metaElement = article.querySelector(
      '.text-\\[11px\\].text-slate-600'
    ) as HTMLElement | null;
    if (metaElement && listing.bids && listing.endsAt) {
      const bidCount = listing.bids.length;
      const timeLeft = formatTimeRemaining(listing.endsAt);
      metaElement.textContent = `${bidCount} ${bidCount === 1 ? 'bid' : 'bids'} • ${timeLeft}`;
    }
  }

  if (tileId === 'tile-b' && config.showTileBDescription) {
    const descElement = article.querySelector(
      '.text-\\[11px\\].text-slate-600'
    ) as HTMLElement | null;
    if (descElement && listing.description) {
      descElement.textContent =
        listing.description.substring(0, config.tileBDescriptionLength) + '...';
    }
  }
}
