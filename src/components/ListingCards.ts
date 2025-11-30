import type { Listing } from '../types/api';
import { formatTimeRemaining, isAuctionActive } from '../utils/formatDate';
import { formatCurrency } from '../utils/formatCurrency';

/**
 * CARD TYPE 1: Product Card (Featured/Trending)
 * Large card with detailed information
 * Features: Square image, lot number, status badge, full description, bid info box, seller info
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

  // Get seller username
  const sellerName = listing.seller?.name || 'Unknown';

  return `
    <article class="bg-white" style="border: 3px solid #1e293b">
      <!-- Image -->
      <div class="aspect-square bg-slate-100" style="border-bottom: 3px solid #1e293b">
        <a href="/listing.html?id=${listing.id}">
          <img
            src="${imageUrl}"
            alt="${imageAlt}"
            class="h-full w-full object-cover"
            loading="lazy"
          />
        </a>
      </div>

      <!-- Content -->
      <div class="p-8">
        <!-- Header: Lot Number + Badge -->
        <div class="mb-6 flex items-center justify-between pb-6" style="border-bottom: 2px solid #e2e8f0">
          <span class="text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500">
            Lot ${listing.id.slice(-3)}
          </span>
          <div class="flex items-center gap-1.5">
            ${
              !isActive
                ? '<i class="fa-solid fa-hourglass-end text-red-700 text-sm"></i><span class="text-[11px] font-bold tracking-[0.18em] uppercase text-red-700">Ended</span>'
                : bids.length > 20
                ? '<i class="fa-solid fa-fire text-red-700 text-sm"></i><span class="text-[11px] font-bold tracking-[0.18em] uppercase text-red-700">Hot</span>'
                : bids.length === 0
                ? '<i class="fa-solid fa-sparkles text-green-700 text-sm"></i><span class="text-[11px] font-bold tracking-[0.18em] uppercase text-green-700">New</span>'
                : '<i class="fa-solid fa-arrow-trend-up text-green-700 text-sm"></i><span class="text-[11px] font-bold tracking-[0.18em] uppercase text-red-700">Leading</span>'
            }
          </div>
        </div>

        <!-- Title -->
        <h3 class="mb-4 text-3xl font-bold leading-tight text-slate-900">
          <a href="/listing.html?id=${listing.id}" class="hover:underline">
            ${listing.title}
          </a>
        </h3>

        <!-- Description -->
        <p class="mb-8 text-sm font-normal leading-relaxed text-slate-600">
          ${listing.description || 'No description provided.'}
        </p>

        <!-- Bid Info Box -->
        <div class="mb-8 bg-slate-50 p-6" style="border: 2px solid #334155">
          <div class="flex items-center justify-between">
            <div>
              <div class="mb-2 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500">
                ${highestBid > 0 ? 'Current Bid' : 'Starting Bid'}
              </div>
              <div class="text-3xl font-bold text-slate-900">
                ${formatCurrency(highestBid)}
              </div>
            </div>
            <div class="text-right">
              <div class="mb-2 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500">
                ${isActive ? 'Time Left' : 'Status'}
              </div>
              <div class="text-2xl font-bold text-slate-900">
                ${timeRemaining}
              </div>
            </div>
          </div>
        </div>

        <!-- Footer: Bid count + Seller -->
        <div class="mb-6 flex items-center justify-between text-xs text-slate-500">
          <span class="inline-flex items-center gap-1">
            <i class="fa-solid fa-gavel text-xs"></i> ${listing._count?.bids || 0} bid${(listing._count?.bids || 0) !== 1 ? 's' : ''}
          </span>
          <span>@${sellerName}</span>
        </div>

        <!-- CTA Button -->
        <a
          href="/listing.html?id=${listing.id}"
          class="w-full bg-slate-900 py-4 text-sm font-bold tracking-wide text-white transition-colors hover:bg-slate-800 inline-flex items-center justify-center gap-2"
          style="border: 3px solid #1e293b"
        >
          <i class="fa-solid fa-gavel text-sm"></i>
          Place Bid
        </a>
      </div>
    </article>
  `;
}

/**
 * CARD TYPE 2: Quick Card (Compact)
 * Smaller card for "Ending Soon" sections
 * Features: Rectangular image, lot number, time badge, compact bid info
 */
export function createQuickCard(listing: Listing): string {
  const timeRemaining = formatTimeRemaining(listing.endsAt);

  const bids = listing.bids || [];
  const highestBid = bids.length > 0
    ? Math.max(...bids.map(bid => bid.amount))
    : 0;

  const imageUrl = listing.media?.[0]?.url || 'https://via.placeholder.com/600x400?text=No+Image';
  const imageAlt = listing.media?.[0]?.alt || listing.title;

  const sellerName = listing.seller?.name || 'Unknown';

  return `
    <article class="bg-white" style="border: 3px solid #1e293b">
      <!-- Image -->
      <div class="h-48 bg-slate-100" style="border-bottom: 3px solid #1e293b">
        <a href="/listing.html?id=${listing.id}">
          <img
            src="${imageUrl}"
            alt="${imageAlt}"
            class="h-full w-full object-cover"
            loading="lazy"
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
        <a
          href="/listing.html?id=${listing.id}"
          class="w-full bg-slate-900 py-3 text-sm font-bold tracking-wide text-white transition-colors hover:bg-slate-800 inline-flex items-center justify-center gap-2"
          style="border: 3px solid #1e293b"
        >
          <i class="fa-solid fa-gavel text-sm"></i>
          Place Bid
        </a>
      </div>
    </article>
  `;
}

/**
 * CARD TYPE 3: Listing Card (Enhanced Grid)
 * Enhanced card with hover effects for catalog pages
 * Features: Square image, category badge, favorite button, hover overlay, enhanced interactions
 */
export function createEnhancedListingCard(listing: Listing): string {
  const isActive = isAuctionActive(listing.endsAt);
  const timeRemaining = formatTimeRemaining(listing.endsAt);

  const bids = listing.bids || [];
  const highestBid = bids.length > 0
    ? Math.max(...bids.map(bid => bid.amount))
    : 0;

  const imageUrl = listing.media?.[0]?.url || 'https://via.placeholder.com/500x500?text=No+Image';
  const imageAlt = listing.media?.[0]?.alt || listing.title;

  // Extract tag for category badge
  const tag = listing.tags?.[0] || 'General';

  // Determine status badge
  let statusBadge = '';
  if (!isActive) {
    statusBadge = `
      <div class="absolute top-3 right-3 bg-slate-600 px-3 py-1 text-xs font-bold text-white" style="border: 2px solid #475569">
        ENDED
      </div>`;
  } else if (bids.length === 0) {
    statusBadge = `
      <div class="absolute top-3 right-3 bg-blue-600 px-3 py-1 text-xs font-bold text-white" style="border: 2px solid #1e40af">
        NEW
      </div>`;
  } else {
    // Parse time remaining to determine urgency
    const hoursMatch = timeRemaining.match(/(\d+)h/);
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 999;

    if (hours < 6) {
      statusBadge = `
        <div class="absolute top-3 left-3 bg-red-600 px-3 py-2 text-xs font-bold text-white shadow-lg animate-pulse inline-flex items-center gap-1.5" style="border: 2px solid #991b1b">
          <i class="fa-solid fa-fire"></i> ${timeRemaining}
        </div>`;
    } else {
      statusBadge = `
        <div class="absolute top-3 right-3 bg-green-600 px-3 py-1 text-xs font-bold text-white" style="border: 2px solid #15803d">
          ${timeRemaining}
        </div>`;
    }
  }

  return `
    <article class="bg-white transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl group relative" style="border: 2px solid #1e293b">
      <div class="relative overflow-hidden">
        <!-- Image with hover effect -->
        <div class="aspect-square bg-slate-100 overflow-hidden" style="border-bottom: 2px solid #1e293b">
          <a href="/listing.html?id=${listing.id}">
            <img
              src="${imageUrl}"
              alt="${imageAlt}"
              class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          </a>

          <!-- Overlay on hover -->
          <div class="absolute inset-0 bg-slate-900 bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
            <button
              onclick="window.location.href='/listing.html?id=${listing.id}'"
              class="bg-white px-6 py-3 text-xs font-bold text-slate-900 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300"
              style="border: 2px solid #1e293b"
            >
              Quick View
            </button>
          </div>
        </div>

        <!-- Status Badge -->
        ${statusBadge}

        <!-- Favorite Button -->
        <button
          class="absolute top-3 right-3 bg-white p-2 hover:bg-slate-900 group/fav transition-all"
          style="border: 2px solid #1e293b"
          title="Add to watchlist"
          onclick="event.preventDefault(); this.classList.toggle('bg-red-600');"
        >
          <svg
            class="w-5 h-5 text-slate-700 group-hover/fav:text-white transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-5">
        <!-- Lot Number + Category Badge -->
        <div class="mb-3 flex items-center justify-between text-[11px] font-bold tracking-[0.18em] uppercase">
          <span class="text-slate-500">Lot ${listing.id.slice(-3)}</span>
          <span class="bg-blue-100 text-blue-800 px-2 py-1" style="border: 1px solid #3b82f6">
            ${tag}
          </span>
        </div>

        <!-- Title -->
        <h3 class="mb-3 text-xl font-bold leading-tight text-slate-900 group-hover:text-blue-600 transition-colors">
          <a href="/listing.html?id=${listing.id}" class="hover:underline">
            ${listing.title}
          </a>
        </h3>

        <!-- Bid Count -->
        <div class="mb-4 flex items-center gap-2 text-xs text-slate-600">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span class="font-bold">${listing._count?.bids || 0} bids</span>
        </div>

        <!-- Price -->
        <div class="mb-4 flex items-baseline gap-2">
          <span class="text-3xl font-bold text-slate-900">${highestBid}</span>
          <span class="text-sm text-slate-500 uppercase tracking-wider">Credits</span>
        </div>

        <!-- CTA Button -->
        <a
          href="/listing.html?id=${listing.id}"
          class="w-full bg-slate-900 py-3 text-xs font-bold tracking-wide text-white hover:bg-blue-600 transition-all transform hover:scale-105 inline-flex items-center justify-center gap-2"
          style="border: 2px solid #1e293b"
        >
          <i class="fa-solid fa-eye text-xs"></i>
          View & Bid
        </a>
      </div>
    </article>
  `;
}

/**
 * Original listing card - kept for backward compatibility
 * Create a listing card HTML element
 */
export function createListingCard(listing: Listing): string {
  const isActive = isAuctionActive(listing.endsAt);
  const timeRemaining = formatTimeRemaining(listing.endsAt);
  
  // Get highest bid amount
  const bids = listing.bids || [];
  const highestBid = bids.length > 0 
    ? Math.max(...bids.map(bid => bid.amount))
    : 0;
  
  // Get listing image
  const imageUrl = listing.media?.[0]?.url || 'https://via.placeholder.com/400x300?text=No+Image';
  const imageAlt = listing.media?.[0]?.alt || listing.title;

  return `
    <article class="group bg-white border-2 border-slate-900 overflow-hidden hover:shadow-lg transition-shadow">
      <!-- Image -->
      <a href="/listing.html?id=${listing.id}" class="block aspect-[4/3] overflow-hidden bg-slate-100">
        <img 
          src="${imageUrl}" 
          alt="${imageAlt}"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </a>

      <!-- Content -->
      <div class="p-4">
        <!-- Title -->
        <h3 class="font-serif font-bold text-lg mb-2 line-clamp-2">
          <a href="/listing.html?id=${listing.id}" class="hover:underline">
            ${listing.title}
          </a>
        </h3>

        <!-- Description (if exists) -->
        ${
          listing.description
            ? `<p class="text-sm text-slate-600 mb-3 line-clamp-2">${listing.description}</p>`
            : ''
        }

        <!-- Bid Info -->
        <div class="flex items-center justify-between mb-3">
          <div>
            <div class="text-xs text-slate-500 uppercase tracking-wide mb-1">
              ${highestBid > 0 ? 'Current Bid' : 'Starting Bid'}
            </div>
            <div class="font-bold text-lg">
              ${formatCurrency(highestBid)}
            </div>
          </div>
          <div class="text-right">
            <div class="text-xs text-slate-500 uppercase tracking-wide mb-1">
              ${isActive ? 'Ends In' : 'Status'}
            </div>
            <div class="font-bold ${isActive ? 'text-slate-900' : 'text-red-600'}">
              ${timeRemaining}
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between pt-3 border-t border-slate-200">
          <!-- Bid Count -->
          <div class="flex items-center gap-1 text-sm text-slate-600">
            <i class="fa-solid fa-gavel text-xs"></i>
            <span>${listing._count?.bids || 0} bid${(listing._count?.bids || 0) !== 1 ? 's' : ''}</span>
          </div>

          <!-- View Button -->
          <a 
            href="/listing.html?id=${listing.id}" 
            class="text-sm font-medium text-slate-900 hover:underline"
          >
            View Details →
          </a>
        </div>
      </div>
    </article>
  `;
}

/**
 * Render multiple listing cards in a grid
 */
export function renderListingGrid(
  listings: Listing[],
  containerId: string = 'listings-grid'
): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (listings.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12">
        <i class="fa-solid fa-box-open text-6xl text-slate-300 mb-4"></i>
        <h3 class="font-serif font-bold text-xl text-slate-900 mb-2">No Listings Found</h3>
        <p class="text-slate-600">Try adjusting your search or filters.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = listings.map(listing => createListingCard(listing)).join('');
}

/**
 * Create a loading skeleton for listing cards
 */
export function createListingCardSkeleton(): string {
  return `
    <div class="bg-white border-2 border-slate-900 overflow-hidden animate-pulse">
      <!-- Image Skeleton -->
      <div class="aspect-[4/3] bg-slate-200"></div>
      
      <!-- Content Skeleton -->
      <div class="p-4">
        <div class="h-6 bg-slate-200 rounded mb-2"></div>
        <div class="h-4 bg-slate-200 rounded mb-3 w-3/4"></div>
        
        <div class="flex justify-between mb-3">
          <div class="w-24 h-12 bg-slate-200 rounded"></div>
          <div class="w-24 h-12 bg-slate-200 rounded"></div>
        </div>
        
        <div class="pt-3 border-t border-slate-200">
          <div class="h-4 bg-slate-200 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Show loading skeletons
 */
export function showListingSkeletons(
  count: number = 9,
  containerId: string = 'listings-grid'
): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  const skeletons = Array(count)
    .fill(null)
    .map(() => createListingCardSkeleton())
    .join('');

  container.innerHTML = skeletons;
}

/**
 * ========================================
 * GRID RENDERING FUNCTIONS FOR NEW CARDS
 * ========================================
 */

/**
 * Render Product Cards (Featured/Trending) in a 3-column grid
 * Use for: Featured sections, trending auctions, highlighted items
 */
export function renderProductCardGrid(
  listings: Listing[],
  containerId: string = 'product-grid'
): void {
  const container = document.getElementById(containerId);
  if (!container) return;

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

  container.innerHTML = listings.map(listing => createProductCard(listing)).join('');
}

/**
 * Render Quick Cards (Compact) in a 4-column grid
 * Use for: Ending soon sections, compact list views
 */
export function renderQuickCardGrid(
  listings: Listing[],
  containerId: string = 'quick-grid'
): void {
  const container = document.getElementById(containerId);
  if (!container) return;

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

  container.innerHTML = listings.map(listing => createQuickCard(listing)).join('');
}

/**
 * Render Enhanced Listing Cards in a 4-column grid
 * Use for: Catalog pages, collection pages, search results
 */
export function renderEnhancedListingGrid(
  listings: Listing[],
  containerId: string = 'enhanced-grid'
): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (listings.length === 0) {
    container.innerHTML = `
      <div class="col-span-full bg-white p-12 text-center" style="border: 3px solid #1e293b">
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

  container.innerHTML = listings.map(listing => createEnhancedListingCard(listing)).join('');
}

/**
 * ========================================
 * SKELETON LOADERS FOR NEW CARD TYPES
 * ========================================
 */

/**
 * Create a skeleton loader for Product Cards
 */
export function createProductCardSkeleton(): string {
  return `
    <div class="bg-white animate-pulse" style="border: 3px solid #1e293b">
      <div class="aspect-square bg-slate-200" style="border-bottom: 3px solid #1e293b"></div>
      <div class="p-8">
        <div class="mb-6 flex items-center justify-between pb-6" style="border-bottom: 2px solid #e2e8f0">
          <div class="h-3 bg-slate-200 rounded w-16"></div>
          <div class="h-3 bg-slate-200 rounded w-12"></div>
        </div>
        <div class="h-8 bg-slate-200 rounded mb-4"></div>
        <div class="h-4 bg-slate-200 rounded mb-2"></div>
        <div class="h-4 bg-slate-200 rounded mb-8 w-3/4"></div>
        <div class="mb-8 bg-slate-50 p-6" style="border: 2px solid #334155">
          <div class="flex justify-between">
            <div class="h-12 bg-slate-200 rounded w-24"></div>
            <div class="h-12 bg-slate-200 rounded w-24"></div>
          </div>
        </div>
        <div class="h-12 bg-slate-200 rounded"></div>
      </div>
    </div>
  `;
}

/**
 * Create a skeleton loader for Quick Cards
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
 * Create a skeleton loader for Enhanced Listing Cards
 */
export function createEnhancedListingCardSkeleton(): string {
  return `
    <div class="bg-white animate-pulse" style="border: 2px solid #1e293b">
      <div class="aspect-square bg-slate-200" style="border-bottom: 2px solid #1e293b"></div>
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

/**
 * Show Product Card skeletons
 */
export function showProductCardSkeletons(
  count: number = 3,
  containerId: string = 'product-grid'
): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  const skeletons = Array(count)
    .fill(null)
    .map(() => createProductCardSkeleton())
    .join('');

  container.innerHTML = skeletons;
}

/**
 * Show Quick Card skeletons
 */
export function showQuickCardSkeletons(
  count: number = 4,
  containerId: string = 'quick-grid'
): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  const skeletons = Array(count)
    .fill(null)
    .map(() => createQuickCardSkeleton())
    .join('');

  container.innerHTML = skeletons;
}

/**
 * Show Enhanced Listing Card skeletons
 */
export function showEnhancedListingSkeletons(
  count: number = 8,
  containerId: string = 'enhanced-grid'
): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  const skeletons = Array(count)
    .fill(null)
    .map(() => createEnhancedListingCardSkeleton())
    .join('');

  container.innerHTML = skeletons;
}