import type { Listing } from '../types/api';
import { formatTimeRemaining, isAuctionActive } from '../utils/formatDate';
import { isLoggedIn } from '../utils/auth';
import { toast } from './Toast';

/**
 * Collection Card Component
 * Use for: Catalog pages, collection pages, search results, browse grids
 */

/**
 * Create a single Collection Card
 * @param listing - The listing data
 * @returns HTML string for the collection card
 */
export function createCollectionCard(listing: Listing): string {
  const isActive = isAuctionActive(listing.endsAt);
  const timeRemaining = formatTimeRemaining(listing.endsAt);

  const bids = listing.bids || [];
  const highestBid = bids.length > 0
    ? Math.max(...bids.map(bid => bid.amount))
    : 0;

  const imageUrl = listing.media?.[0]?.url || 'https://via.placeholder.com/500x500?text=No+Image';
  const imageAlt = listing.media?.[0]?.alt || listing.title;

  // Extract tag for category badge (use first tag or default)
  const tag = listing.tags?.[0] || 'General';

  // Determine status badge based on listing state and urgency
  const getStatusBadge = (): string => {
    if (!isActive) {
      return `
        <div class="absolute top-3 right-3 bg-slate-600 px-3 py-1 text-xs font-bold text-white" style="border: 2px solid #475569">
          ENDED
        </div>`;
    }

    if (bids.length === 0) {
      return `
        <div class="absolute top-3 right-3 bg-blue-600 px-3 py-1 text-xs font-bold text-white" style="border: 2px solid #1e40af">
          NEW
        </div>`;
    }

    // Parse time remaining to determine urgency
    const hoursMatch = timeRemaining.match(/(\d+)h/);
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 999;

    if (hours < 6) {
      // Less than 6 hours - URGENT (red, pulsing, with fire icon)
      return `
        <div class="absolute top-3 left-3 bg-red-600 px-3 py-2 text-xs font-bold text-white shadow-lg animate-pulse inline-flex items-center gap-1.5" style="border: 2px solid #991b1b">
          <i class="fa-solid fa-fire"></i> ${timeRemaining}
        </div>`;
    } else {
      // More than 6 hours - normal (green)
      return `
        <div class="absolute top-3 right-3 bg-green-600 px-3 py-1 text-xs font-bold text-white" style="border: 2px solid #15803d">
          ${timeRemaining}
        </div>`;
    }
  };

  return `
    <article
      class="bg-white transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl group relative"
      style="border: 2px solid #1e293b"
      data-listing-id="${listing.id}"
    >
      <div class="relative overflow-hidden">
        <!-- Image with hover effect -->
        <div class="aspect-square bg-slate-100 overflow-hidden" style="border-bottom: 2px solid #1e293b">
          <a href="/listing.html?id=${listing.id}" class="block h-full">
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
              class="bg-white px-6 py-3 text-xs font-bold text-slate-900 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300"
              style="border: 2px solid #1e293b"
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
        <button
          class="absolute top-3 right-3 bg-white p-2 hover:bg-slate-900 group/fav transition-all"
          style="border: 2px solid #1e293b"
          title="Add to watchlist"
          data-action="toggle-favorite"
          data-listing-id="${listing.id}"
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
          class="w-full bg-slate-900 py-3 text-xs font-bold tracking-wide text-white hover:bg-blue-600 transition-all transform hover:scale-105 inline-flex items-center justify-center gap-2"
          style="border: 2px solid #1e293b"
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

/**
 * Render Collection Cards in a grid container
 * @param listings - Array of listing data
 * @param containerId - ID of the container element
 */
export function renderCollectionCards(
  listings: Listing[],
  containerId: string = 'collection-cards-grid'
): void {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id "${containerId}" not found`);
    return;
  }

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

  // Render all cards
  container.innerHTML = listings.map(listing => createCollectionCard(listing)).join('');

  // Attach event listeners for interactive elements
  attachCollectionCardEvents(containerId);
}

/**
 * Attach event listeners to Collection Card interactive elements
 * @param containerId - ID of the container element
 */
export function attachCollectionCardEvents(containerId: string = 'collection-cards-grid'): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Handle "View & Bid" button clicks
  const viewBidButtons = container.querySelectorAll<HTMLButtonElement>('[data-action="view-bid"]');
  viewBidButtons.forEach(button => {
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

  // Handle "Quick View" button clicks
  const quickViewButtons = container.querySelectorAll<HTMLButtonElement>('[data-action="quick-view"]');
  quickViewButtons.forEach(button => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const listingId = button.getAttribute('data-listing-id');

      if (!listingId) {
        console.error('No listing ID found on button');
        return;
      }

      // Check if user is logged in
      if (!isLoggedIn()) {
        toast.error('Please log in to view listing details');
        setTimeout(() => {
          window.location.href = `/login.html?redirect=/listing.html?id=${listingId}`;
        }, 1500);
        return;
      }

      // Redirect to listing detail page
      window.location.href = `/listing.html?id=${listingId}`;
    });
  });

  // Handle "Favorite" button clicks
  const favoriteButtons = container.querySelectorAll<HTMLButtonElement>('[data-action="toggle-favorite"]');
  favoriteButtons.forEach(button => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      // Toggle favorite state (visual only for now)
      const svg = button.querySelector('svg');
      if (svg) {
        const currentFill = svg.getAttribute('fill');
        if (currentFill === 'none') {
          // Add to favorites
          svg.setAttribute('fill', 'currentColor');
          button.classList.add('bg-red-600');
          button.querySelector('svg')?.classList.remove('text-slate-700');
          button.querySelector('svg')?.classList.add('text-white');
        } else {
          // Remove from favorites
          svg.setAttribute('fill', 'none');
          button.classList.remove('bg-red-600');
          button.querySelector('svg')?.classList.remove('text-white');
          button.querySelector('svg')?.classList.add('text-slate-700');
        }
      }

      // Here you would typically call an API to save the favorite state
      const listingId = button.getAttribute('data-listing-id');
      console.log('Toggle favorite for listing:', listingId);
    });
  });
}

/**
 * Create loading skeleton for Collection Card
 */
export function createCollectionCardSkeleton(): string {
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
 * Show loading skeletons in the container
 * @param count - Number of skeletons to show
 * @param containerId - ID of the container element
 */
export function showCollectionCardSkeletons(
  count: number = 8,
  containerId: string = 'collection-cards-grid'
): void {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id "${containerId}" not found`);
    return;
  }

  const skeletons = Array(count)
    .fill(null)
    .map(() => createCollectionCardSkeleton())
    .join('');

  container.innerHTML = skeletons;
}
