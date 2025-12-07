import { renderHeader } from '../components/navbar';
import { renderFooter } from '../components/Footer';
import {
  renderCollectionCards,
  showCollectionCardSkeletons,
} from '../components/CollectionCard';
import { getListings } from '../api/listings';
import type { Listing } from '../types/api';

// State management
interface FilterState {
  category: string;
  sort: string;
  sortOrder: 'asc' | 'desc';
  activeOnly: boolean;
  search: string;
  page: number;
  limit: number;
}

let currentFilters: FilterState = {
  category: 'all',
  sort: 'created',
  sortOrder: 'desc',
  activeOnly: false,
  search: '',
  page: 1,
  limit: 24,
};

let allListings: Listing[] = [];
let filteredListings: Listing[] = [];

/**
 * Listen to navbar filter events
 */
function listenToNavbarFilters(): void {
  // Category filter from navbar
  document.addEventListener('categoryFilterChange', ((e: CustomEvent) => {
    currentFilters.category = e.detail.category;
    currentFilters.page = 1;
    applyFilters();
  }) as EventListener);

  // Search from navbar
  document.addEventListener('globalSearchInput', ((e: CustomEvent) => {
    currentFilters.search = e.detail.query;
    currentFilters.page = 1;
    applyFilters();
  }) as EventListener);

  // Active only checkbox from navbar
  document.addEventListener('activeOnlyChange', ((e: CustomEvent) => {
    currentFilters.activeOnly = e.detail.activeOnly;
    currentFilters.page = 1;
    applyFilters();
  }) as EventListener);

  // Sort from navbar
  document.addEventListener('sortChange', ((e: CustomEvent) => {
    currentFilters.sort = e.detail.sort;
    currentFilters.sortOrder = e.detail.order;
    currentFilters.page = 1;
    applyFilters();
  }) as EventListener);
}

/**
 * Initialize filter event listeners
 */
function initializeFilters(): void {
  // View toggle (grid vs list)
  const gridViewBtn = document.getElementById('grid-view-btn');
  const listViewBtn = document.getElementById('list-view-btn');
  const listingsGrid = document.getElementById('collection-cards-grid');

  if (gridViewBtn && listViewBtn && listingsGrid) {
    gridViewBtn.addEventListener('click', () => {
      listingsGrid.className = 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-12 transition-all';
      gridViewBtn.classList.remove('bg-white', 'text-slate-700');
      gridViewBtn.classList.add('bg-slate-900', 'text-white');
      listViewBtn.classList.remove('bg-slate-900', 'text-white');
      listViewBtn.classList.add('bg-white', 'text-slate-700');
    });

    listViewBtn.addEventListener('click', () => {
      listingsGrid.className = 'grid gap-6 grid-cols-1 mb-12 transition-all';
      listViewBtn.classList.remove('bg-white', 'text-slate-700');
      listViewBtn.classList.add('bg-slate-900', 'text-white');
      gridViewBtn.classList.remove('bg-slate-900', 'text-white');
      gridViewBtn.classList.add('bg-white', 'text-slate-700');
    });
  }

  // Refresh listings button
  const refreshBtn = document.getElementById('refresh-listings-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      // Add spinning animation
      const icon = refreshBtn.querySelector('i');
      if (icon) {
        icon.classList.add('fa-spin');
      }

      // Reload listings
      loadListings().finally(() => {
        if (icon) {
          icon.classList.remove('fa-spin');
        }
      });
    });
  }

  // Clear filters button
  const clearFiltersBtn = document.getElementById('clear-filters-btn');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      // Reset filters to default
      currentFilters = {
        category: 'all',
        sort: 'created',
        sortOrder: 'desc',
        activeOnly: false,
        search: '',
        page: 1,
        limit: 24,
      };

      // Dispatch events to update navbar UI
      document.dispatchEvent(new CustomEvent('clearAllFilters'));

      // Reapply filters
      applyFilters();
    });
  }
}

/**
 * Initialize collection page
 */
export async function initCollectionPage(): Promise<void> {
  // Render header and footer
  await renderHeader();
  renderFooter();

  // Initialize view toggle filters
  initializeFilters();

  // Listen to navbar filter events
  listenToNavbarFilters();

  // Load listings
  loadListings();
}

/**
 * Load listings from API
 */
async function loadListings(): Promise<void> {
  try {
    // Show loading skeletons
    showCollectionCardSkeletons(24, 'collection-cards-grid');

    // Fetch listings with filters
    const response = await getListings({
      limit: 100, // Get more listings for client-side filtering
      _seller: true,
      _bids: true,
      sort: currentFilters.sort,
      sortOrder: currentFilters.sortOrder,
    });

    if (response.data) {
      allListings = response.data;
      applyFilters();
      updateStats();
    }
  } catch (error) {
    console.error('Error loading listings:', error);
    showError('Failed to load listings. Please try again later.');
  }
}

/**
 * Apply filters to listings
 */
function applyFilters(): void {
  let filtered = [...allListings];

  // Filter by category
  if (currentFilters.category !== 'all') {
    filtered = filtered.filter((listing) =>
      listing.tags?.some(
        (tag) => tag.toLowerCase() === currentFilters.category.toLowerCase()
      )
    );
  }

  // Filter by search
  if (currentFilters.search) {
    const searchLower = currentFilters.search.toLowerCase();
    filtered = filtered.filter(
      (listing) =>
        listing.title.toLowerCase().includes(searchLower) ||
        listing.description?.toLowerCase().includes(searchLower)
    );
  }

  // Filter by active only
  if (currentFilters.activeOnly) {
    const now = new Date();
    filtered = filtered.filter((listing) => new Date(listing.endsAt) > now);
  }

  // Sort listings
  filtered.sort((a, b) => {
    const aValue = a[currentFilters.sort as keyof Listing] as string;
    const bValue = b[currentFilters.sort as keyof Listing] as string;

    if (currentFilters.sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  filteredListings = filtered;

  // Render paginated results
  renderPaginatedResults();
  updateResultsInfo();
}

/**
 * Render paginated results
 */
function renderPaginatedResults(): void {
  const start = (currentFilters.page - 1) * currentFilters.limit;
  const end = start + currentFilters.limit;
  const paginatedListings = filteredListings.slice(start, end);

  renderCollectionCards(paginatedListings, 'collection-cards-grid');
  renderPagination();

  // Scroll to top of results
  const resultsHeader = document.querySelector('#collection-cards-grid');
  if (resultsHeader && currentFilters.page > 1) {
    resultsHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Render pagination controls
 */
function renderPagination(): void {
  const paginationContainer = document.getElementById('pagination');
  if (!paginationContainer) return;

  const totalPages = Math.ceil(filteredListings.length / currentFilters.limit);

  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }

  const currentPage = currentFilters.page;

  let paginationHTML = `
    <div class="text-sm text-slate-600">
      Page <span class="font-bold text-slate-900">${currentPage}</span> of
      <span class="font-bold text-slate-900">${totalPages}</span>
    </div>
    <div class="flex items-center gap-2">
  `;

  // Previous button
  paginationHTML += `
    <button
      class="inline-flex items-center gap-2 px-6 py-3 text-xs font-bold tracking-wide ${currentPage === 1 ? 'cursor-not-allowed bg-slate-200 text-slate-400' : 'bg-white text-slate-900 hover:bg-slate-50'}"
      style="border: 2px solid ${currentPage === 1 ? '#cbd5e1' : '#334155'}"
      ${currentPage === 1 ? 'disabled' : ''}
      data-page="${currentPage - 1}"
    >
      <i class="text-xs fa-solid fa-chevron-left"></i>
      PREVIOUS
    </button>
  `;

  // Page numbers
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  if (startPage > 1) {
    paginationHTML += `
      <button
        class="px-6 py-3 text-xs font-bold tracking-wide bg-white text-slate-700 hover:bg-slate-50"
        style="border: 2px solid #334155"
        data-page="1"
      >
        1
      </button>
    `;
    if (startPage > 2) {
      paginationHTML += `<span class="px-3 text-slate-500">...</span>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
      <button
        class="px-6 py-3 text-xs font-bold tracking-wide ${i === currentPage ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}"
        style="border: 2px solid ${i === currentPage ? '#1e293b' : '#334155'}"
        data-page="${i}"
      >
        ${i}
      </button>
    `;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHTML += `<span class="px-3 text-slate-500">...</span>`;
    }
    paginationHTML += `
      <button
        class="px-6 py-3 text-xs font-bold tracking-wide bg-white text-slate-700 hover:bg-slate-50"
        style="border: 2px solid #334155"
        data-page="${totalPages}"
      >
        ${totalPages}
      </button>
    `;
  }

  // Next button
  paginationHTML += `
    <button
      class="inline-flex items-center gap-2 px-6 py-3 text-xs font-bold tracking-wide ${currentPage === totalPages ? 'cursor-not-allowed bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-slate-800'}"
      style="border: 2px solid ${currentPage === totalPages ? '#cbd5e1' : '#1e293b'}"
      ${currentPage === totalPages ? 'disabled' : ''}
      data-page="${currentPage + 1}"
    >
      NEXT
      <i class="text-xs fa-solid fa-chevron-right"></i>
    </button>
  `;

  paginationHTML += `</div>`;

  paginationContainer.innerHTML = paginationHTML;

  // Add event listeners to pagination buttons
  const pageButtons = paginationContainer.querySelectorAll<HTMLButtonElement>('button[data-page]');
  pageButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const page = parseInt(button.getAttribute('data-page') || '1', 10);
      if (page >= 1 && page <= totalPages) {
        currentFilters.page = page;
        renderPaginatedResults();
      }
    });
  });
}

/**
 * Update results information display
 */
function updateResultsInfo(): void {
  const resultsCount = document.getElementById('results-count');
  const resultsRange = document.getElementById('results-range');
  const resultsTotal = document.getElementById('results-total');

  if (resultsCount) {
    resultsCount.textContent = new Intl.NumberFormat('en-US').format(
      filteredListings.length
    );
  }

  if (resultsTotal) {
    resultsTotal.textContent = new Intl.NumberFormat('en-US').format(
      filteredListings.length
    );
  }

  if (resultsRange) {
    const start = (currentFilters.page - 1) * currentFilters.limit + 1;
    const end = Math.min(
      currentFilters.page * currentFilters.limit,
      filteredListings.length
    );

    if (filteredListings.length === 0) {
      resultsRange.textContent = '0-0';
    } else {
      resultsRange.textContent = `${start}-${end}`;
    }
  }
}

/**
 * Update hero stats
 */
function updateStats(): void {
  const activeLotsCount = document.getElementById('active-lots-count');
  const endingSoonCount = document.getElementById('ending-soon-count');

  if (activeLotsCount) {
    activeLotsCount.textContent = new Intl.NumberFormat('en-US').format(
      allListings.length
    );
  }

  if (endingSoonCount) {
    // Count listings ending in next 24 hours
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const endingSoon = allListings.filter((listing) => {
      const endsAt = new Date(listing.endsAt);
      return endsAt <= tomorrow && endsAt >= new Date();
    });

    endingSoonCount.textContent = new Intl.NumberFormat('en-US').format(
      endingSoon.length
    );
  }
}


/**
 * Show error message
 */
function showError(message: string): void {
  const container = document.getElementById('collection-cards-grid');
  if (!container) return;

  container.innerHTML = `
    <div class="col-span-full bg-white p-12 text-center" style="border: 3px solid #1e293b">
      <i class="fa-solid fa-exclamation-circle text-6xl text-red-300 mb-4"></i>
      <h3 class="font-serif font-bold text-xl text-slate-900 mb-2">Error</h3>
      <p class="text-slate-600 mb-4">${message}</p>
      <button
        onclick="window.location.reload()"
        class="bg-slate-900 text-white px-6 py-3 hover:bg-slate-800 transition-colors"
        style="border: 2px solid #1e293b"
      >
        Reload Page
      </button>
    </div>
  `;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCollectionPage);
} else {
  initCollectionPage();
}
