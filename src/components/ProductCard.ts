import type { Listing } from '../types/api';
import { formatTimeRemaining, isAuctionActive } from '../utils/formatDate';
import { formatCurrency } from '../utils/formatCurrency';
import { isLoggedIn } from '../utils/auth';
import { toast } from './Toast';
import { generateResponsiveImageAttrs } from '../utils/imageOptimization';

/**
 * Product Card Component
 * Use for: Featured sections, trending auctions, highlighted items
 */

/**
 * Create a single Product Card
 * @param listing - The listing data
 * @returns HTML string for the product card
 */
export function createProductCard(listing: Listing): string {
  const isActive = isAuctionActive(listing.endsAt);
  const timeRemaining = formatTimeRemaining(listing.endsAt);

  const bids = listing.bids || [];
  const highestBid = bids.length > 0
    ? Math.max(...bids.map(bid => bid.amount))
    : 0;

  const imageUrl = listing.media?.[0]?.url || 'https://via.placeholder.com/600x600?text=No+Image';
  const imageAlt = listing.media?.[0]?.alt || listing.title;

  // Generate responsive image attributes
  const imgAttrs = generateResponsiveImageAttrs(imageUrl, imageAlt, 'square');

  // Get seller username
  const sellerName = listing.seller?.name || 'Unknown';

  // Determine status badge based on listing state
  const getStatusBadge = (): string => {
    if (!isActive) {
      return `
        <i class="fa-solid fa-hourglass-end text-red-700 text-sm"></i>
        <span class="text-[11px] font-bold tracking-[0.18em] uppercase text-red-700">Ended</span>
      `;
    }

    if (bids.length > 20) {
      return `
        <i class="fa-solid fa-fire text-red-700 text-sm"></i>
        <span class="text-[11px] font-bold tracking-[0.18em] uppercase text-red-700">Hot</span>
      `;
    }

    if (bids.length === 0) {
      return `
        <i class="fa-solid fa-sparkles text-green-700 text-sm"></i>
        <span class="text-[11px] font-bold tracking-[0.18em] uppercase text-green-700">New</span>
      `;
    }

    return `
      <i class="fa-solid fa-arrow-trend-up text-green-700 text-sm"></i>
      <span class="text-[11px] font-bold tracking-[0.18em] uppercase text-red-700">Leading</span>
    `;
  };

  return `
    <article class="bg-white" style="border: 3px solid #1e293b" data-listing-id="${listing.id}">
      <!-- Image -->
      <div class="aspect-square bg-slate-100" style="border-bottom: 3px solid #1e293b">
        <a href="/listing.html?id=${listing.id}" class="block h-full">
          <img
            src="${imgAttrs.src}"
            ${imgAttrs.srcset ? `srcset="${imgAttrs.srcset}"` : ''}
            alt="${imgAttrs.alt}"
            width="${imgAttrs.width}"
            height="${imgAttrs.height}"
            sizes="${imgAttrs.sizes}"
            loading="${imgAttrs.loading}"
            decoding="${imgAttrs.decoding}"
            class="h-full w-full object-cover"
            referrerpolicy="no-referrer"
          />
        </a>
      </div>

      <!-- Content -->
      <div class="p-4 sm:p-5">
        <!-- Header: Lot Number + Status Badge -->
        <div class="mb-3 flex items-center justify-between pb-3" style="border-bottom: 2px solid #e2e8f0">
          <span class="text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500">
            Lot ${listing.id.slice(-3)}
          </span>
          <div class="flex items-center gap-1.5">
            ${getStatusBadge()}
          </div>
        </div>

        <!-- Title -->
        <h3 class="mb-2 text-xl sm:text-2xl font-bold leading-tight text-slate-900 line-clamp-2">
          <a href="/listing.html?id=${listing.id}" class="hover:underline">
            ${listing.title}
          </a>
        </h3>

        <!-- Description -->
        <p class="mb-4 text-xs sm:text-sm font-normal leading-relaxed text-slate-600 line-clamp-2">
          ${listing.description || 'No description provided.'}
        </p>

        <!-- Bid Info Box -->
        <div class="mb-4 bg-slate-50 p-3 sm:p-4" style="border: 2px solid #334155">
          <div class="flex items-center justify-between gap-2">
            <div>
              <div class="mb-1 text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500">
                ${highestBid > 0 ? 'Current Bid' : 'Starting Bid'}
              </div>
              <div class="text-lg sm:text-xl font-bold text-slate-900">
                ${formatCurrency(highestBid)}
              </div>
            </div>
            <div class="text-right">
              <div class="mb-1 text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500">
                ${isActive ? 'Time Left' : 'Status'}
              </div>
              <div class="text-base sm:text-lg font-bold text-slate-900">
                ${timeRemaining}
              </div>
            </div>
          </div>
        </div>

        <!-- Footer: Bid count + Seller -->
        <div class="mb-3 flex items-center justify-between text-xs text-slate-500">
          <span class="inline-flex items-center gap-1">
            <i class="fa-solid fa-gavel text-xs"></i>
            ${listing._count?.bids || 0} bid${(listing._count?.bids || 0) !== 1 ? 's' : ''}
          </span>
          <span>@${sellerName}</span>
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
          ${isActive ? 'Place Bid' : 'Auction Ended'}
        </button>
      </div>
    </article>
  `;
}

/**
 * Render Product Cards in a grid container
 * @param listings - Array of listing data
 * @param containerId - ID of the container element
 */
export function renderProductCards(
  listings: Listing[],
  containerId: string = 'product-cards-grid'
): void {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id "${containerId}" not found`);
    return;
  }

  if (listings.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12">
        <i class="fa-solid fa-box-open text-6xl text-slate-300 mb-4"></i>
        <h3 class="font-serif font-bold text-xl text-slate-900 mb-2">No Listings Found</h3>
        <p class="text-slate-600">Check back soon for new featured auctions.</p>
      </div>
    `;
    return;
  }

  // Render all cards
  container.innerHTML = listings.map(listing => createProductCard(listing)).join('');

  // Attach event listeners for Place Bid buttons
  attachProductCardEvents(containerId);
}

/**
 * Attach event listeners to Product Card buttons
 * @param containerId - ID of the container element
 */
export function attachProductCardEvents(containerId: string = 'product-cards-grid'): void {
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
 * Create loading skeleton for Product Card
 */
export function createProductCardSkeleton(): string {
  return `
    <div class="bg-white animate-pulse" style="border: 3px solid #1e293b">
      <div class="aspect-square bg-slate-200" style="border-bottom: 3px solid #1e293b"></div>
      <div class="p-4 sm:p-5">
        <div class="mb-3 flex items-center justify-between pb-3" style="border-bottom: 2px solid #e2e8f0">
          <div class="h-3 bg-slate-200 rounded w-16"></div>
          <div class="h-3 bg-slate-200 rounded w-12"></div>
        </div>
        <div class="h-6 bg-slate-200 rounded mb-2"></div>
        <div class="h-4 bg-slate-200 rounded mb-4 w-3/4"></div>
        <div class="mb-4 bg-slate-50 p-3 sm:p-4" style="border: 2px solid #334155">
          <div class="flex justify-between">
            <div class="h-10 bg-slate-200 rounded w-24"></div>
            <div class="h-10 bg-slate-200 rounded w-24"></div>
          </div>
        </div>
        <div class="mb-3 flex justify-between">
          <div class="h-3 bg-slate-200 rounded w-16"></div>
          <div class="h-3 bg-slate-200 rounded w-20"></div>
        </div>
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
export function showProductCardSkeletons(
  count: number = 3,
  containerId: string = 'product-cards-grid'
): void {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id "${containerId}" not found`);
    return;
  }

  const skeletons = Array(count)
    .fill(null)
    .map(() => createProductCardSkeleton())
    .join('');

  container.innerHTML = skeletons;
}
