import { getListings } from '../api/listings';
import { renderHeader } from '../components/Header';
import { renderFooter } from '../components/Footer';
import {
  renderListingGrid,
  showListingSkeletons,
} from '../components/ListingCards';
import { toast } from '../components//Toast';
import type { Listing } from '../types/api';

// State
let currentPage = 1;
let currentSearch = '';
let currentSort = 'created';
let currentSortOrder: 'asc' | 'desc' = 'desc';
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

  // Initialize filters
  initializeFilters();

  // Initialize sort
  initializeSort();
}

/**
 * Load listings from API
 */
async function loadListings(): Promise<void> {
  if (isLoading) return;

  try {
    isLoading = true;
    showListingSkeletons(9);

    const response = await getListings({
      search: currentSearch || undefined,
      page: currentPage,
      limit: 30,
      sort: currentSort,
      sortOrder: currentSortOrder,
      _seller: true,
      _bids: true,
    });

    const listings = response.data;
    renderListingGrid(listings);

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
 * Initialize filter functionality
 */
function initializeFilters(): void {
  // Clear filters button
  const clearFiltersBtn = document.getElementById('clear-filters-btn');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      currentSearch = '';
      currentSort = 'created';
      currentSortOrder = 'desc';
      currentPage = 1;

      // Clear search inputs
      const searchInputs = document.querySelectorAll<HTMLInputElement>(
        'input[name="q"]'
      );
      searchInputs.forEach((input) => {
        input.value = '';
      });

      // Reset sort select
      const sortSelect = document.getElementById(
        'sort-select'
      ) as HTMLSelectElement;
      if (sortSelect) {
        sortSelect.value = 'created-desc';
      }

      // Update URL
      window.history.pushState({}, '', '/index.html');

      // Reload listings
      loadListings();
    });
  }

  // Filter by status (active/ended)
  const statusFilters = document.querySelectorAll<HTMLButtonElement>(
    '[data-status-filter]'
  );
  statusFilters.forEach((btn) => {
    btn.addEventListener('click', () => {
      const status = btn.dataset.statusFilter;

      // Visual feedback
      statusFilters.forEach((b) => b.classList.remove('bg-slate-900', 'text-white'));
      btn.classList.add('bg-slate-900', 'text-white');

      // Filter listings (client-side for now)
      filterByStatus(status || 'all');
    });
  });
}

/**
 * Filter listings by status (client-side)
 */
function filterByStatus(status: string): void {
  const allCards = document.querySelectorAll('#listings-grid > article');

  allCards.forEach((card) => {
    const cardElement = card as HTMLElement;
    const endTimeText = cardElement.querySelector('[class*="Ends In"]');

    if (!endTimeText) return;

    const isEnded = endTimeText.textContent?.includes('Ended');

    if (status === 'all') {
      cardElement.style.display = '';
    } else if (status === 'active' && !isEnded) {
      cardElement.style.display = '';
    } else if (status === 'ended' && isEnded) {
      cardElement.style.display = '';
    } else {
      cardElement.style.display = 'none';
    }
  });
}

/**
 * Initialize sort functionality
 */
function initializeSort(): void {
  const sortSelect = document.getElementById('sort-select') as HTMLSelectElement;
  if (!sortSelect) return;

  sortSelect.addEventListener('change', () => {
    const value = sortSelect.value;
    const [sort, order] = value.split('-');

    currentSort = sort;
    currentSortOrder = order as 'asc' | 'desc';
    currentPage = 1;

    loadListings();
  });
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHomePage);
} else {
  initHomePage();
}