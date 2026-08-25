import { renderHeader } from '../components/Navbar';
import { renderFooter } from '../components/Footer';
import {
  renderCollectionCards,
  showCollectionCardSkeletons,
} from '../components/CollectionCard';
import { renderPagination } from '../components/PaginationComponent';
import {
  activeStats,
  catalogPage,
  toSortKey,
  toSortOrder,
} from '../api/listingQueries';
import type { SortKey, SortOrder } from '../api/listingQueries';
import { formatTimeRemainingCompact } from '../utils/formatDate';
import { logError } from '../utils/logger';
import type { Listing } from '../types/api';

// State management
interface FilterState {
  category: string;
  sort: SortKey;
  sortOrder: SortOrder;
  activeOnly: boolean;
  search: string;
  page: number;
  itemsPerPage: number;
  viewMode: 'grid' | 'list';
}

let currentFilters: FilterState = {
  category: 'all',
  sort: 'created',
  sortOrder: 'desc',
  activeOnly: false,
  search: '',
  page: 1,
  itemsPerPage: 24,
  viewMode: 'grid',
};

// The page the server last returned, kept so a view-mode toggle can re-render it without spending a round trip.
let currentPageListings: Listing[] = [];
let resultTotals = { totalCount: 0, pageCount: 1 };
let loadRequestId = 0;
let nextCloseInterval: number | null = null;

function listenToNavbarFilters(): void {
  // Category filter from navbar
  document.addEventListener('categoryFilterChange', ((e: CustomEvent) => {
    currentFilters.category = e.detail.category;
    currentFilters.page = 1;
    loadListings();
  }) as EventListener);

  // Search from navbar
  document.addEventListener('globalSearchInput', ((e: CustomEvent) => {
    currentFilters.search = e.detail.query;
    currentFilters.page = 1;
    loadListings();
  }) as EventListener);

  // Active only checkbox from navbar
  document.addEventListener('activeOnlyChange', ((e: CustomEvent) => {
    currentFilters.activeOnly = e.detail.activeOnly;
    currentFilters.page = 1;
    loadListings();
  }) as EventListener);

  // Sort from navbar
  document.addEventListener('sortChange', ((e: CustomEvent) => {
    // Narrowed, not trusted: an unknown sort field is a 500 from the API.
    currentFilters.sort = toSortKey(e.detail.sort);
    currentFilters.sortOrder = toSortOrder(e.detail.order);
    currentFilters.page = 1;
    loadListings();
  }) as EventListener);
}

function initializeFilters(): void {
  // View toggle (grid vs list)
  const gridViewBtn = document.getElementById('grid-view-btn');
  const listViewBtn = document.getElementById('list-view-btn');
  const listingsGrid = document.getElementById('collection-cards-grid');

  if (gridViewBtn && listViewBtn && listingsGrid) {
    gridViewBtn.addEventListener('click', () => {
      currentFilters.viewMode = 'grid';
      listingsGrid.className =
        'grid grid-cols-1 gap-6 mb-12 transition-all sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
      gridViewBtn.classList.remove(
        'bg-white',
        'text-slate-700',
        'hover:bg-slate-50'
      );
      gridViewBtn.classList.add('bg-slate-900', 'text-white');
      listViewBtn.classList.remove('bg-slate-900', 'text-white');
      listViewBtn.classList.add(
        'bg-white',
        'text-slate-700',
        'hover:bg-slate-50'
      );

      // Re-render cards in grid mode
      renderCurrentPage();
    });

    listViewBtn.addEventListener('click', () => {
      currentFilters.viewMode = 'list';
      listingsGrid.className = 'grid grid-cols-1 gap-6 mb-12 transition-all';
      listViewBtn.classList.remove(
        'bg-white',
        'text-slate-700',
        'hover:bg-slate-50'
      );
      listViewBtn.classList.add('bg-slate-900', 'text-white');
      gridViewBtn.classList.remove('bg-slate-900', 'text-white');
      gridViewBtn.classList.add(
        'bg-white',
        'text-slate-700',
        'hover:bg-slate-50'
      );

      // Re-render cards in list mode
      renderCurrentPage();
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

      // Spin until both the grid and the tiles have settled
      Promise.allSettled([loadListings(), loadStats()]).finally(() => {
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
        itemsPerPage: 24,
        viewMode: 'grid',
      };

      // Dispatch events to update navbar UI
      document.dispatchEvent(new CustomEvent('clearAllFilters'));

      // Sort and active-only are both part of the API query, so the pool itself is stale after a reset;
      //   always refetch rather than re-sorting whatever happened to be loaded.
      loadListings();
    });
  }
}

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
  loadStats();
}

/**
 * Fetch one page of the catalog.
 *
 * Every filter is part of the query, so the counter and the pagination describe the whole matching set rather than the slice that happened to be fetched.
 */
async function loadListings(): Promise<void> {
  const requestId = ++loadRequestId;

  try {
    // Show loading skeletons
    showCollectionCardSkeletons(
      currentFilters.itemsPerPage,
      'collection-cards-grid'
    );

    const result = await catalogPage({
      page: currentFilters.page,
      limit: currentFilters.itemsPerPage,
      sort: currentFilters.sort,
      sortOrder: currentFilters.sortOrder,
      activeOnly: currentFilters.activeOnly,
      tag: currentFilters.category,
      search: currentFilters.search,
    });

    // A newer request started while this one was in flight
    if (requestId !== loadRequestId) return;

    currentPageListings = result.listings;
    resultTotals = {
      totalCount: result.totalCount,
      pageCount: result.pageCount,
    };
    renderCurrentPage();
  } catch (error) {
    if (requestId !== loadRequestId) return;

    logError('Failed to load collection listings', error);
    showError('Failed to load listings. Please try again later.');
  }
}

/** Draw the page already in hand. No query — the view toggle uses this too. */
function renderCurrentPage(): void {
  renderCollectionCards(
    currentPageListings,
    'collection-cards-grid',
    currentFilters.viewMode
  );

  renderPagination({
    containerId: 'pagination',
    currentPage: currentFilters.page,
    totalPages: resultTotals.pageCount,
    onPageChange: (page: number) => {
      currentFilters.page = page;
      loadListings();

      // Scroll to top of results
      const resultsHeader = document.querySelector('#collection-cards-grid');
      if (resultsHeader) {
        resultsHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
  });

  updateResultsInfo();
}

function updateResultsInfo(): void {
  const resultsCount = document.getElementById('results-count');
  const resultsRange = document.getElementById('results-range');
  const resultsTotal = document.getElementById('results-total');

  const total = resultTotals.totalCount;

  if (resultsCount) {
    resultsCount.textContent = new Intl.NumberFormat('en-US').format(total);
  }

  if (resultsTotal) {
    resultsTotal.textContent = new Intl.NumberFormat('en-US').format(total);
  }

  if (resultsRange) {
    const start = (currentFilters.page - 1) * currentFilters.itemsPerPage + 1;
    const end = start + currentPageListings.length - 1;

    resultsRange.textContent =
      currentPageListings.length === 0 ? '0-0' : `${start}-${end}`;
  }
}

/**
 * The stat tiles describe the whole active pool, not the page currently shown, so they get their own query instead of counting the filtered grid.
 */
async function loadStats(): Promise<void> {
  try {
    const { totalActive, nextToClose } = await activeStats();

    const activeLotsCount = document.getElementById('active-lots-count');
    if (activeLotsCount) {
      activeLotsCount.textContent = new Intl.NumberFormat('en-US').format(
        totalActive
      );
    }

    // Time until the next close, rather than a count inside a fixed window that sits at zero whenever nothing is closing.
    startNextCloseCountdown(nextToClose?.endsAt);
  } catch (error) {
    logError('Failed to load collection stats', error);
  }
}

/**
 * Keep the "next closes" tile ticking.
 * Without this it would still read the value it was given on page load hours later, for a lot that has since closed.
 */
function startNextCloseCountdown(endsAt?: string): void {
  if (nextCloseInterval) {
    window.clearInterval(nextCloseInterval);
    nextCloseInterval = null;
  }

  const tile = document.getElementById('next-close-countdown');
  if (!tile) return;

  if (!endsAt) {
    tile.textContent = '--';
    return;
  }

  const tick = (): void => {
    const remaining = formatTimeRemainingCompact(endsAt);
    tile.textContent = remaining;

    // That lot has closed, so another one is now next in line
    if (remaining === 'Ended') {
      window.clearInterval(nextCloseInterval ?? undefined);
      nextCloseInterval = null;
      loadStats();
    }
  };

  tick();
  // Minute granularity is enough: the tile never shows units below a minute
  nextCloseInterval = window.setInterval(tick, 60_000);
}

function showError(message: string): void {
  const container = document.getElementById('collection-cards-grid');
  if (!container) return;

  container.innerHTML = `
    <div class="col-span-full bg-white p-12 text-center" style="border: 3px solid var(--aucto-border-dark)">
      <i class="fa-solid fa-exclamation-circle text-6xl text-red-300 mb-4"></i>
      <h3 class="font-serif font-bold text-xl text-slate-900 mb-2">Error</h3>
      <p class="text-slate-600 mb-4">${message}</p>
      <button
        onclick="window.location.reload()"
        class="bg-slate-900 text-white px-6 py-3 hover:bg-slate-800 transition-colors"
        style="border: 2px solid var(--aucto-border-dark)"
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
