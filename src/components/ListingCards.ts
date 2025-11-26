import type { Listing } from '../types/api';
import { formatTimeRemaining, isAuctionActive } from '../utils/formatDate';
import { formatCurrency } from '../utils/formatCurrency';

/**
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