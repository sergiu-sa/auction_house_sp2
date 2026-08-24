import type { Listing } from '../types/api';
import { formatTimeRemaining, isAuctionActive } from '../utils/formatDate';
import { generateResponsiveImageAttrs } from '../utils/imageOptimization';
import { isWatched, toggleWatched } from '../utils/storage';
import { logError } from '../utils/logger';
import { escapeHtml } from '../utils/escapeHtml';

function renderFavoriteButton(listingId: string, borderStyle: string): string {
  const watched = isWatched(listingId);
  const buttonClass = watched
    ? 'absolute top-3 right-3 bg-red-600 p-2 group/fav transition-all'
    : 'absolute top-3 right-3 bg-white p-2 hover:bg-slate-900 group/fav transition-all';
  const svgClass = watched
    ? 'w-5 h-5 text-white transition-colors'
    : 'w-5 h-5 text-slate-700 group-hover/fav:text-white transition-colors';
  const fill = watched ? 'currentColor' : 'none';

  return `
    <button
      class="${buttonClass}"
      style="${borderStyle}"
      aria-label="${watched ? 'Remove from watchlist' : 'Add to watchlist'}"
      aria-pressed="${watched}"
      data-action="toggle-favorite"
      data-listing-id="${listingId}"
    >
      <svg
        class="${svgClass}"
        fill="${fill}"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  `;
}

export function createCollectionCard(
  listing: Listing,
  viewMode: 'grid' | 'list' = 'grid'
): string {
  const isActive = isAuctionActive(listing.endsAt);
  const timeRemaining = formatTimeRemaining(listing.endsAt);

  const bids = listing.bids || [];
  const highestBid =
    bids.length > 0 ? Math.max(...bids.map((bid) => bid.amount)) : 0;

  const imageUrl = listing.media?.[0]?.url || '/images/placeholder.svg';
  const imageAlt = listing.media?.[0]?.alt || listing.title;

  const imgAttrs = generateResponsiveImageAttrs(imageUrl, imageAlt, 'square');

  const tag = listing.tags?.[0] || 'General';

  const getStatusBadge = (): string => {
    if (!isActive) {
      return `
        <div class="absolute top-3 left-3 bg-slate-600 px-3 py-1 text-xs font-bold text-white" style="border: 2px solid #475569">
          ENDED
        </div>`;
    }

    if (bids.length === 0) {
      return `
        <div class="absolute top-3 left-3 bg-slate-900 px-3 py-1 text-xs font-bold text-white" style="border: 2px solid var(--aucto-border-dark)">
          NEW
        </div>`;
    }

    const hoursMatch = timeRemaining.match(/(\d+)h/);
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 999;

    // Under 6h left = urgency styling (red, pulsing).
    if (hours < 6) {
      return `
        <div class="absolute top-3 left-3 bg-red-600 px-3 py-2 text-xs font-bold text-white shadow-lg animate-pulse inline-flex items-center gap-1.5" style="border: 2px solid #991b1b">
          <i class="fa-solid fa-fire"></i> ${timeRemaining}
        </div>`;
    } else {
      return `
        <div class="absolute top-3 left-3 bg-green-600 px-3 py-1 text-xs font-bold text-white" style="border: 2px solid #15803d">
          ${timeRemaining}
        </div>`;
    }
  };

  // List view layout
  if (viewMode === 'list') {
    return `
      <article
        class="bg-white transition-all duration-300 hover:shadow-xl group relative flex flex-col sm:flex-row"
        style="border: 3px solid var(--aucto-border-dark)"
        data-listing-id="${listing.id}"
      >
        <!-- Image Section (Fixed width in list view) -->
        <div class="relative overflow-hidden sm:w-64 flex-shrink-0">
          <div class="aspect-square sm:h-full bg-slate-100 overflow-hidden" style="border-bottom: 3px solid #1e293b; border-right: 0; sm:border-right: 3px solid #1e293b; sm:border-bottom: 0;">
            <a href="/listing.html?id=${listing.id}" class="block h-full">
              <img
                src="${escapeHtml(imgAttrs.src)}"
                ${imgAttrs.srcset ? `srcset="${escapeHtml(imgAttrs.srcset)}"` : ''}
                alt="${escapeHtml(imgAttrs.alt)}"
                width="${imgAttrs.width}"
                height="${imgAttrs.height}"
                sizes="${imgAttrs.sizes}"
                loading="${imgAttrs.loading}"
                decoding="${imgAttrs.decoding}"
                class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                referrerpolicy="no-referrer"
              />
            </a>

            <!-- Status Badge -->
            ${getStatusBadge()}

            <!-- Favorite Button -->
            ${renderFavoriteButton(listing.id, 'border: 2px solid #1e293b')}
          </div>
        </div>

        <!-- Content Section -->
        <div class="flex-1 p-6 flex flex-col justify-between">
          <div>
            <!-- Lot Number + Category Badge -->
            <div class="mb-3 flex items-center gap-3 text-[11px] font-bold tracking-[0.18em] uppercase">
              <span class="text-slate-500">Lot ${listing.id.slice(-3)}</span>
              <span class="bg-slate-100 text-slate-800 px-2 py-1" style="border: 1px solid var(--aucto-border-mid)">
                ${escapeHtml(tag)}
              </span>
            </div>

            <!-- Title -->
            <h3 class="mb-3 text-2xl font-bold leading-tight text-slate-900 group-hover:text-aucto-red transition-colors break-words">
              <a href="/listing.html?id=${listing.id}" class="hover:underline">
                ${escapeHtml(listing.title)}
              </a>
            </h3>

            <!-- Description -->
            ${
              listing.description
                ? `
              <p class="mb-4 text-sm text-slate-600 line-clamp-2">
                ${escapeHtml(listing.description)}
              </p>
            `
                : ''
            }

            <!-- Bid Count -->
            <div class="mb-4 flex items-center gap-2 text-xs text-slate-600">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span class="font-bold">${listing._count?.bids || 0} bids</span>
            </div>
          </div>

          <!-- Bottom: Price + CTA -->
          <div class="flex items-center justify-between gap-4 mt-4">
            <!-- Price -->
            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-bold text-slate-900">${highestBid}</span>
              <span class="text-sm text-slate-500 uppercase tracking-wider">Credits</span>
            </div>

            <!-- CTA Button -->
            <button
              class="bg-slate-900 px-8 py-3 text-xs font-bold tracking-wide text-white hover:bg-slate-800 transition-all inline-flex items-center justify-center gap-2"
              style="border: 3px solid var(--aucto-border-dark)"
              data-action="view-bid"
              data-listing-id="${listing.id}"
              ${!isActive ? 'disabled' : ''}
            >
              <i class="fa-solid fa-eye text-xs"></i>
              ${isActive ? 'View & Bid' : 'Auction Ended'}
            </button>
          </div>
        </div>
      </article>
    `;
  }

  // Grid view layout (default)
  return `
    <article
      class="bg-white transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl group relative"
      style="border: 3px solid var(--aucto-border-dark)"
      data-listing-id="${listing.id}"
    >
      <div class="relative overflow-hidden">
        <!-- Image -->
        <div class="aspect-[3/2] sm:aspect-square bg-slate-100 overflow-hidden" style="border-bottom: 3px solid var(--aucto-border-dark)">
          <a href="/listing.html?id=${listing.id}" class="block h-full">
            <img
              src="${escapeHtml(imgAttrs.src)}"
              ${imgAttrs.srcset ? `srcset="${escapeHtml(imgAttrs.srcset)}"` : ''}
              alt="${escapeHtml(imgAttrs.alt)}"
              width="${imgAttrs.width}"
              height="${imgAttrs.height}"
              sizes="${imgAttrs.sizes}"
              loading="${imgAttrs.loading}"
              decoding="${imgAttrs.decoding}"
              class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              referrerpolicy="no-referrer"
            />
          </a>

          <!-- Hover overlay -->
          <div class="absolute inset-0 bg-slate-900 bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
            <button
              class="bg-white px-6 py-3 text-xs font-bold text-slate-900 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300"
              style="border: 3px solid var(--aucto-border-dark)"
              data-action="quick-view"
              data-listing-id="${listing.id}"
            >
              Quick View
            </button>
          </div>
        </div>

        <!-- Status Badge -->
        ${getStatusBadge()}

        <!-- Favorite Button -->
        ${renderFavoriteButton(listing.id, 'border: 3px solid #1e293b')}
      </div>

      <!-- Content -->
      <div class="p-5">
        <!-- Lot Number + Category Badge -->
        <div class="mb-3 flex items-center justify-between text-[11px] font-bold tracking-[0.18em] uppercase">
          <span class="text-slate-500">Lot ${listing.id.slice(-3)}</span>
          <span class="bg-slate-100 text-slate-800 px-2 py-1" style="border: 1px solid var(--aucto-border-mid)">
            ${escapeHtml(tag)}
          </span>
        </div>

        <!-- Title -->
        <h3 class="mb-3 text-xl font-bold leading-tight text-slate-900 group-hover:text-aucto-red transition-colors break-words">
          <a href="/listing.html?id=${listing.id}" class="hover:underline">
            ${escapeHtml(listing.title)}
          </a>
        </h3>

        <!-- Bid Count -->
        <div class="mb-4 flex items-center gap-2 text-xs text-slate-600">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <span class="font-bold">${listing._count?.bids || 0} bids</span>
        </div>

        <!-- Price -->
        <div class="mb-4 flex items-baseline gap-2">
          <span class="text-3xl font-bold text-slate-900">${highestBid}</span>
          <span class="text-sm text-slate-500 uppercase tracking-wider">Credits</span>
        </div>

        <!-- CTA Button -->
        <button
          class="w-full bg-slate-900 py-3 text-xs font-bold tracking-wide text-white hover:bg-slate-800 transition-all transform hover:scale-105 inline-flex items-center justify-center gap-2"
          style="border: 3px solid var(--aucto-border-dark)"
          data-action="view-bid"
          data-listing-id="${listing.id}"
          ${!isActive ? 'disabled' : ''}
        >
          <i class="fa-solid fa-eye text-xs"></i>
          ${isActive ? 'View & Bid' : 'Auction Ended'}
        </button>
      </div>
    </article>
  `;
}

export function renderCollectionCards(
  listings: Listing[],
  containerId: string = 'collection-cards-grid',
  viewMode: 'grid' | 'list' = 'grid'
): void {
  const container = document.getElementById(containerId);
  if (!container) {
    logError(`Container with id "${containerId}" not found`);
    return;
  }

  if (listings.length === 0) {
    container.innerHTML = `
      <div class="col-span-full bg-white p-12 text-center" style="border: 3px solid var(--aucto-border-dark)">
        <div class="max-w-md mx-auto">
          <svg class="w-24 h-24 mx-auto mb-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 class="text-3xl font-bold text-slate-900 mb-3">No Listings Found</h3>
          <p class="text-slate-600 mb-6">
            We couldn't find any auctions matching your filters. Try adjusting your search criteria or browse all available items.
          </p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = listings
    .map((listing) => createCollectionCard(listing, viewMode))
    .join('');

  attachCollectionCardEvents(containerId);
}

export function attachCollectionCardEvents(
  containerId: string = 'collection-cards-grid'
): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  // View & Bid buttons
  const viewBidButtons = container.querySelectorAll<HTMLButtonElement>(
    '[data-action="view-bid"]'
  );
  viewBidButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const listingId = button.getAttribute('data-listing-id');

      if (!listingId) {
        logError('View & Bid button missing data-listing-id');
        return;
      }

      window.location.href = `/listing.html?id=${listingId}`;
    });
  });

  // Quick View buttons
  const quickViewButtons = container.querySelectorAll<HTMLButtonElement>(
    '[data-action="quick-view"]'
  );
  quickViewButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const listingId = button.getAttribute('data-listing-id');

      if (!listingId) {
        logError('Quick view button missing data-listing-id');
        return;
      }

      window.location.href = `/listing.html?id=${listingId}`;
    });
  });

  // Favorite buttons (persist to watchlist in localStorage)
  const favoriteButtons = container.querySelectorAll<HTMLButtonElement>(
    '[data-action="toggle-favorite"]'
  );
  favoriteButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      const listingId = button.getAttribute('data-listing-id');
      if (!listingId) {
        logError('Favorite button missing data-listing-id');
        return;
      }

      const nowWatched = toggleWatched(listingId);
      const svg = button.querySelector('svg');

      button.setAttribute('aria-pressed', String(nowWatched));
      button.setAttribute(
        'aria-label',
        nowWatched ? 'Remove from watchlist' : 'Add to watchlist'
      );

      if (nowWatched) {
        button.classList.remove('bg-white', 'hover:bg-slate-900');
        button.classList.add('bg-red-600');
        if (svg) {
          svg.setAttribute('fill', 'currentColor');
          svg.classList.remove('text-slate-700', 'group-hover/fav:text-white');
          svg.classList.add('text-white');
        }
      } else {
        button.classList.remove('bg-red-600');
        button.classList.add('bg-white', 'hover:bg-slate-900');
        if (svg) {
          svg.setAttribute('fill', 'none');
          svg.classList.remove('text-white');
          svg.classList.add('text-slate-700', 'group-hover/fav:text-white');
        }
      }
    });
  });
}

export function createCollectionCardSkeleton(): string {
  return `
    <div class="bg-white animate-pulse" style="border: 3px solid var(--aucto-border-dark)">
      <div class="aspect-[3/2] sm:aspect-square bg-slate-200" style="border-bottom: 3px solid var(--aucto-border-dark)"></div>
      <div class="p-5">
        <div class="mb-3 flex items-center justify-between">
          <div class="h-3 bg-slate-200 rounded w-16"></div>
          <div class="h-5 bg-slate-200 rounded w-16"></div>
        </div>
        <div class="h-6 bg-slate-200 rounded mb-3"></div>
        <div class="h-4 bg-slate-200 rounded mb-4 w-20"></div>
        <div class="h-8 bg-slate-200 rounded mb-4 w-24"></div>
        <div class="h-10 bg-slate-200 rounded"></div>
      </div>
    </div>
  `;
}

export function showCollectionCardSkeletons(
  count: number = 8,
  containerId: string = 'collection-cards-grid'
): void {
  const container = document.getElementById(containerId);
  if (!container) {
    logError(`Container with id "${containerId}" not found`);
    return;
  }

  const skeletons = Array(count)
    .fill(null)
    .map(() => createCollectionCardSkeleton())
    .join('');

  container.innerHTML = skeletons;
}
