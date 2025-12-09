import type { Listing } from '../types/api';
import { formatTimeRemaining, isAuctionActive } from '../utils/formatDate';
import { formatCurrency } from '../utils/formatCurrency';
import { isLoggedIn } from '../utils/auth';
import { toast } from './Toast';

/**
 * Quick Card Component
 * Use for: Ending soon sections, urgent listings, compact displays
 */

/**
 * Create a single Quick Card
 * @param listing - The listing data
 * @returns HTML string for the quick card
 */
export function createQuickCard(listing: Listing): string {
  const isActive = isAuctionActive(listing.endsAt);
  const timeRemaining = formatTimeRemaining(listing.endsAt);

  const bids = listing.bids || [];
  const highestBid = bids.length > 0
    ? Math.max(...bids.map(bid => bid.amount))
    : 0;

  const imageUrl = listing.media?.[0]?.url || 'https://via.placeholder.com/600x400?text=No+Image';
  const imageAlt = listing.media?.[0]?.alt || listing.title;

  // Get seller username
  const sellerName = listing.seller?.name || 'Unknown';

  return `
    <article class="bg-white" style="border: 3px solid #1e293b" data-listing-id="${listing.id}">
      <!-- Image -->
      <div class="h-48 bg-slate-100" style="border-bottom: 3px solid #1e293b">
        <a href="/listing.html?id=${listing.id}" class="block h-full">
          <img
            src="${imageUrl}"
            alt="${imageAlt}"
            class="h-full w-full object-cover"
            loading="lazy"
            referrerpolicy="no-referrer"
          />
        </a>
      </div>

      <!-- Content -->
      <div class="p-6">
        <!-- Header: Lot Number + Time Badge -->
        <div class="mb-4 flex items-center justify-between pb-4" style="border-bottom: 2px solid #e2e8f0">
          <span class="text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500">
            Lot ${listing.id.slice(-3)}
          </span>
          <div class="flex items-center gap-1.5">
            <i class="fa-solid fa-clock text-red-700 text-xs"></i>
            <span class="text-[11px] font-bold tracking-[0.18em] uppercase text-red-700">
              ${timeRemaining}
            </span>
          </div>
        </div>

        <!-- Title -->
        <h4 class="mb-3 text-xl font-bold text-slate-900">
          <a href="/listing.html?id=${listing.id}" class="hover:underline">
            ${listing.title}
          </a>
        </h4>

        <!-- Bid Info -->
        <div class="mb-4 text-slate-600">
          <div class="text-xs uppercase tracking-wider text-slate-500 mb-1">
            Current Bid
          </div>
          <div class="text-2xl font-bold text-slate-900">
            ${formatCurrency(highestBid)}
          </div>
        </div>

        <!-- Footer: Bids + Seller -->
        <div class="mb-4 text-xs text-slate-500">
          <span>${listing._count?.bids || 0} bids</span> · <span>@${sellerName}</span>
        </div>

        <!-- CTA Button -->
        <button
          class="w-full bg-slate-900 py-3 text-sm font-bold tracking-wide text-white transition-colors hover:bg-slate-800 inline-flex items-center justify-center gap-2"
          style="border: 3px solid #1e293b"
          data-action="place-bid"
          data-listing-id="${listing.id}"
          ${!isActive ? 'disabled' : ''}
        >
          <i class="fa-solid fa-gavel text-sm"></i>
          ${isActive ? 'Place Bid' : 'Ended'}
        </button>
      </div>
    </article>
  `;
}

/**
 * Render Quick Cards in a grid container
 * @param listings - Array of listing data
 * @param containerId - ID of the container element
 */
export function renderQuickCards(
  listings: Listing[],
  containerId: string = 'quick-cards-grid'
): void {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id "${containerId}" not found`);
    return;
  }

  if (listings.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12">
        <i class="fa-solid fa-clock text-6xl text-slate-300 mb-4"></i>
        <h3 class="font-serif font-bold text-xl text-slate-900 mb-2">No Ending Soon</h3>
        <p class="text-slate-600">No auctions ending soon at this time.</p>
      </div>
    `;
    return;
  }

  // Render all cards
  container.innerHTML = listings.map(listing => createQuickCard(listing)).join('');

  // Attach event listeners for Place Bid buttons
  attachQuickCardEvents(containerId);
}

/**
 * Attach event listeners to Quick Card buttons
 * @param containerId - ID of the container element
 */
export function attachQuickCardEvents(containerId: string = 'quick-cards-grid'): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Handle "Place Bid" button clicks
  const bidButtons = container.querySelectorAll<HTMLButtonElement>('[data-action="place-bid"]');

  bidButtons.forEach(button => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const listingId = button.getAttribute('data-listing-id');

      if (!listingId) {
        console.error('No listing ID found on button');
        return;
      }

      // Check if user is logged in
      if (!isLoggedIn()) {
        toast.error('Please log in to place a bid');
        setTimeout(() => {
          window.location.href = `/login.html?redirect=/listing.html?id=${listingId}`;
        }, 1500);
        return;
      }

      // Redirect to listing detail page where user can place bid
      window.location.href = `/listing.html?id=${listingId}`;
    });
  });
}

/**
 * Create loading skeleton for Quick Card
 */
export function createQuickCardSkeleton(): string {
  return `
    <div class="bg-white animate-pulse" style="border: 3px solid #1e293b">
      <div class="h-48 bg-slate-200" style="border-bottom: 3px solid #1e293b"></div>
      <div class="p-6">
        <div class="mb-4 flex items-center justify-between pb-4" style="border-bottom: 2px solid #e2e8f0">
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

/**
 * Show loading skeletons in the container
 * @param count - Number of skeletons to show
 * @param containerId - ID of the container element
 */
export function showQuickCardSkeletons(
  count: number = 4,
  containerId: string = 'quick-cards-grid'
): void {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id "${containerId}" not found`);
    return;
  }

  const skeletons = Array(count)
    .fill(null)
    .map(() => createQuickCardSkeleton())
    .join('');

  container.innerHTML = skeletons;
}
