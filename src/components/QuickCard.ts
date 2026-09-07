import type { Listing } from '../types/api';
import { highestBid } from '../utils/biddingStats';
import { formatTimeRemaining, isAuctionActive } from '../utils/formatDate';
import { formatCurrency } from '../utils/formatCurrency';
import { isLoggedIn } from '../utils/auth';
import { toast } from './Toast';
import { generateResponsiveImageAttrs } from '../utils/imageOptimization';
import { logError } from '../utils/logger';
import { escapeHtml } from '../utils/escapeHtml';
import { initLotImageFallbacks, lotImageSource } from '../utils/listingImage';

// Quick Card — use for ending-soon sections, urgent listings, compact displays.
export function createQuickCard(listing: Listing): string {
  const isActive = isAuctionActive(listing.endsAt);
  const timeRemaining = formatTimeRemaining(listing.endsAt);

  const currentHighest = highestBid(listing.bids);

  const { src: imageUrl, alt: imageAlt } = lotImageSource(
    listing.media,
    listing.title
  );

  // Generate responsive image attributes
  const imgAttrs = generateResponsiveImageAttrs(imageUrl, imageAlt, 'compact');

  // Get seller username
  const sellerName = listing.seller?.name || 'Unknown';

  return `
    <article class="bg-white" style="border: 3px solid var(--aucto-border-dark)" data-listing-id="${listing.id}">
      <!-- Image -->
      <div class="h-48 bg-slate-100" style="border-bottom: 3px solid var(--aucto-border-dark)">
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
            class="h-full w-full object-cover"
            referrerpolicy="no-referrer"
            data-lot-image
          />
        </a>
      </div>

      <!-- Content -->
      <div class="p-6">
        <!-- Header: Lot Number + Time Badge -->
        <div class="mb-4 flex items-center justify-between pb-4" style="border-bottom: 2px solid var(--aucto-border-light)">
          <span class="text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500">
            Lot ${listing.id.slice(-3)}
          </span>
          <div class="flex items-center gap-1.5">
            <i class="fa-solid fa-clock text-red-700 text-xs" aria-hidden="true"></i>
            <span class="text-[11px] font-bold tracking-[0.18em] uppercase text-red-700">
              ${timeRemaining}
            </span>
          </div>
        </div>

        <!-- Title -->
        <h3 class="mb-3 text-xl font-bold text-slate-900">
          <a href="/listing.html?id=${listing.id}" class="hover:underline">
            ${escapeHtml(listing.title)}
          </a>
        </h3>

        <!-- Bid Info -->
        <div class="mb-4 text-slate-600">
          <div class="text-xs uppercase tracking-wider text-slate-500 mb-1">
            Current Bid
          </div>
          <div class="text-2xl font-bold text-slate-900">
            ${formatCurrency(currentHighest)}
          </div>
        </div>

        <!-- Footer: Bids + Seller -->
        <div class="mb-4 text-xs text-slate-500">
          <span>${listing._count?.bids || 0} bids</span> · <span>@${escapeHtml(sellerName)}</span>
        </div>

        <!-- CTA Button -->
        <button
          class="w-full bg-slate-900 py-3 text-sm font-bold tracking-wide text-white transition-colors hover:bg-slate-800 inline-flex items-center justify-center gap-2"
          style="border: 3px solid var(--aucto-border-dark)"
          data-action="place-bid"
          data-listing-id="${listing.id}"
          ${!isActive ? 'disabled' : ''}
        >
          <i class="fa-solid fa-gavel text-sm" aria-hidden="true"></i>
          ${isActive ? 'Place Bid' : 'Ended'}
        </button>
      </div>
    </article>
  `;
}

export function renderQuickCards(
  listings: Listing[],
  containerId: string = 'quick-cards-grid'
): void {
  const container = document.getElementById(containerId);
  if (!container) {
    logError(`Container with id "${containerId}" not found`);
    return;
  }

  if (listings.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12">
        <i class="fa-solid fa-clock text-6xl text-slate-300 mb-4" aria-hidden="true"></i>
        <h3 class="font-serif font-bold text-xl text-slate-900 mb-2">No Ending Soon</h3>
        <p class="text-slate-600">No auctions ending soon at this time.</p>
      </div>
    `;
    return;
  }

  // Render all cards
  container.innerHTML = listings
    .map((listing) => createQuickCard(listing))
    .join('');

  // Attach event listeners for Place Bid buttons
  attachQuickCardEvents(containerId);
}

export function attachQuickCardEvents(
  containerId: string = 'quick-cards-grid'
): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  initLotImageFallbacks(container);

  // Place Bid buttons
  const bidButtons = container.querySelectorAll<HTMLButtonElement>(
    '[data-action="place-bid"]'
  );

  bidButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const listingId = button.getAttribute('data-listing-id');

      if (!listingId) {
        logError('Quick card button missing data-listing-id');
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

export function createQuickCardSkeleton(): string {
  return `
    <div class="bg-white animate-pulse" style="border: 3px solid var(--aucto-border-dark)">
      <div class="h-48 bg-slate-200" style="border-bottom: 3px solid var(--aucto-border-dark)"></div>
      <div class="p-6">
        <div class="mb-4 flex items-center justify-between pb-4" style="border-bottom: 2px solid var(--aucto-border-light)">
          <div class="h-3 bg-slate-200 rounded w-16"></div>
          <div class="h-3 bg-slate-200 rounded w-12"></div>
        </div>
        <div class="h-6 bg-slate-200 rounded mb-3"></div>
        <div class="h-8 bg-slate-200 rounded mb-4 w-32"></div>
        <div class="h-3 bg-slate-200 rounded mb-4 w-24"></div>
        <div class="h-10 bg-slate-200 rounded"></div>
      </div>
    </div>
  `;
}

export function showQuickCardSkeletons(
  count: number = 4,
  containerId: string = 'quick-cards-grid'
): void {
  const container = document.getElementById(containerId);
  if (!container) {
    logError(`Container with id "${containerId}" not found`);
    return;
  }

  const skeletons = Array(count)
    .fill(null)
    .map(() => createQuickCardSkeleton())
    .join('');

  container.innerHTML = skeletons;
}
