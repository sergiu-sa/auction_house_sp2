import { getListings } from '../api/listings';
import { renderHeader } from '../components/navbar';
import { renderFooter } from '../components/Footer';
import {
  renderProductCardGrid,
  showProductCardSkeletons,
} from '../components/ListingCards';
import { toast } from '../components//Toast';
import type { Listing } from '../types/api';

// State
let currentPage = 1;
let currentSearch = '';
let currentSort = 'created';
let currentSortOrder: 'asc' | 'desc' = 'desc';
let currentTag: string | null = null;
let activeOnly = false;
let isLoading = false;

/**
 * Initialize home page
 */
export function initHomePage(): void {
  // Render header and footer
  renderHeader();
  renderFooter();

  // Get search param from URL
  const urlParams = new URLSearchParams(window.location.search);
  currentSearch = urlParams.get('q') || '';

  // Set search input value if exists
  if (currentSearch) {
    const searchInputs = document.querySelectorAll<HTMLInputElement>(
      'input[name="q"]'
    );
    searchInputs.forEach((input) => {
      input.value = currentSearch;
    });
  }

  // Load initial listings
  loadListings();

  // Listen to header filter events
  initializeHeaderFilterListeners();
}

/**
 * Load listings from API
 */
async function loadListings(): Promise<void> {
  if (isLoading) return;

  try {
    isLoading = true;
    showProductCardSkeletons(9, 'listings-grid');

    const response = await getListings({
      search: currentSearch || undefined,
      page: currentPage,
      limit: 30,
      sort: currentSort,
      sortOrder: currentSortOrder,
      _seller: true,
      _bids: true,
    });

    let listings = response.data;

    // Apply client-side filters
    listings = applyClientSideFilters(listings);

    renderProductCardGrid(listings, 'listings-grid');

    // Update result count
    updateResultCount(listings.length, response.meta?.totalCount);
  } catch (error) {
    console.error('Error loading listings:', error);
    toast.error('Failed to load listings. Please try again.');

    // Show error message in grid
    const container = document.getElementById('listings-grid');
    if (container) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12">
          <i class="fa-solid fa-exclamation-circle text-6xl text-red-300 mb-4"></i>
          <h3 class="font-serif font-bold text-xl text-slate-900 mb-2">Failed to Load Listings</h3>
          <p class="text-slate-600 mb-4">Something went wrong. Please try again.</p>
          <button
            onclick="window.location.reload()"
            class="bg-slate-900 text-white px-6 py-2 hover:bg-slate-800 transition-colors"
          >
            Reload Page
          </button>
        </div>
      `;
    }
  } finally {
    isLoading = false;
  }
}

/**
 * Apply client-side filters to listings
 */
function applyClientSideFilters(listings: Listing[]): Listing[] {
  let filtered = [...listings];

  // Filter by tag
  if (currentTag && currentTag !== 'all') {
    filtered = filtered.filter(listing =>
      listing.tags?.some(tag => tag.toLowerCase() === currentTag?.toLowerCase())
    );
  }

  // Filter by active status
  if (activeOnly) {
    const now = new Date();
    filtered = filtered.filter(listing => new Date(listing.endsAt) > now);
  }

  return filtered;
}

/**
 * Update result count display
 */
function updateResultCount(shown: number, total?: number): void {
  const countElement = document.getElementById('result-count');
  if (!countElement) return;

  if (total !== undefined) {
    countElement.textContent = `Showing ${shown} of ${total} listings`;
  } else {
    countElement.textContent = `Showing ${shown} listings`;
  }
}

/**
 * Listen to filter events from Header component
 */
function initializeHeaderFilterListeners(): void {
  // Tag filter change
  document.addEventListener('filterChange', ((e: CustomEvent) => {
    currentTag = e.detail.filter;
    console.log('Filter changed to:', currentTag);
    loadListings();
  }) as EventListener);

  // Active only checkbox change
  document.addEventListener('activeOnlyChange', ((e: CustomEvent) => {
    activeOnly = e.detail.activeOnly;
    console.log('Active only changed to:', activeOnly);
    loadListings();
  }) as EventListener);

  // Sort change
  document.addEventListener('sortChange', ((e: CustomEvent) => {
    currentSort = e.detail.sort;
    currentSortOrder = e.detail.order;
    console.log('Sort changed to:', currentSort, currentSortOrder);
    loadListings();
  }) as EventListener);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHomePage);
} else {
  initHomePage();
}