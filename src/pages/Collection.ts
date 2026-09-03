import { CatalogStateManager } from '../utils/catalogState';
import { prefersReducedMotion } from '../utils/motion';
import { renderHeader } from '../components/Navbar';
import { renderFooter } from '../components/Footer';
import {
  renderCollectionCards,
  showCollectionCardSkeletons,
} from '../components/CollectionCard';
import { renderPagination } from '../components/PaginationComponent';
import { activeStats, catalogPage } from '../api/listingQueries';
import { formatTimeRemainingCompact } from '../utils/formatDate';
import { logError } from '../utils/logger';
import { escapeHtml } from '../utils/escapeHtml';
import type { Listing } from '../types/api';

const catalogManager = new CatalogStateManager(
  { itemsPerPage: 24 },
  loadListings
);

// The page the server last returned, kept so a view-mode toggle can re-render it without spending a round trip.
let currentPageListings: Listing[] = [];
let resultTotals = { totalCount: 0, pageCount: 1 };
let loadRequestId = 0;
let nextCloseInterval: number | null = null;

/** List view is one column; grid view adds these back. Everything else the container needs
 * stays declared in collection.html, so there is only one copy of it. */
const GRID_COLUMNS = ['sm:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4'];

/**
 * The container's columns and the toggle's pressed state are functions of the view mode, not side effects of clicking.
 * Deriving them is what stops grid-shaped children (cards, or skeletons), being laid out in a single list-width column, which blew a card up to 1216x1462.
 */
function applyViewMode(viewMode: 'grid' | 'list'): void {
  const container = document.getElementById('collection-cards-grid');
  for (const columns of GRID_COLUMNS) {
    container?.classList.toggle(columns, viewMode === 'grid');
  }

  const active = document.getElementById(`${viewMode}-view-btn`);
  const inactive = document.getElementById(
    `${viewMode === 'grid' ? 'list' : 'grid'}-view-btn`
  );
  active?.classList.remove('bg-white', 'text-slate-700', 'hover:bg-slate-50');
  active?.classList.add('bg-slate-900', 'text-white');
  inactive?.classList.remove('bg-slate-900', 'text-white');
  inactive?.classList.add('bg-white', 'text-slate-700', 'hover:bg-slate-50');

  // The colour swap above is the only thing that used to say which view is on, so the state was  visible and unannounced.
  // Set here rather than in the click handlers, so the initial paint  and every later change go through one place.
  active?.setAttribute('aria-pressed', 'true');
  inactive?.setAttribute('aria-pressed', 'false');
}

function initializeFilters(): void {
  // View toggle (grid vs list).
  //  Both buttons do the same thing to a different mode, and applyViewMode() draws the result, so there is nothing left to write out twice.
  for (const viewMode of ['grid', 'list'] as const) {
    document
      .getElementById(`${viewMode}-view-btn`)
      ?.addEventListener('click', () => {
        catalogManager.updateViewMode(viewMode);
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
      catalogManager.resetFilters();

      // Dispatch events to update navbar UI
      document.dispatchEvent(new CustomEvent('clearAllFilters'));
    });
  }
}

export function initCollectionPage(): void {
  // Render header and footer
  renderHeader();
  renderFooter();

  // Initialize view toggle filters
  initializeFilters();

  // Listen to navbar filter events
  catalogManager.listenToNavbarFilters();

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
  const state = catalogManager.getState();

  try {
    applyViewMode(state.viewMode);
    showCollectionCardSkeletons(
      state.itemsPerPage,
      'collection-cards-grid',
      state.viewMode
    );

    const result = await catalogPage({
      page: state.page,
      limit: state.itemsPerPage,
      sort: state.sort,
      sortOrder: state.sortOrder,
      activeOnly: state.activeOnly,
      tag: state.category,
      search: state.search,
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
  const state = catalogManager.getState();

  applyViewMode(state.viewMode);
  renderCollectionCards(
    currentPageListings,
    'collection-cards-grid',
    state.viewMode
  );

  renderPagination({
    containerId: 'pagination',
    currentPage: state.page,
    totalPages: resultTotals.pageCount,
    onPageChange: (page: number) => {
      catalogManager.updatePage(page);

      // Scroll to top of results, and take focus with it;
      //  the pagination button that was focused gets replaced by the re-render, which otherwise drops focus to <body>.
      const resultsHeader = document.getElementById('collection-cards-grid');
      if (resultsHeader) {
        resultsHeader.scrollIntoView({
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'start',
        });
        resultsHeader.setAttribute('tabindex', '-1');
        resultsHeader.focus({ preventScroll: true });
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
    const { page, itemsPerPage } = catalogManager.getState();
    const start = (page - 1) * itemsPerPage + 1;
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
      <i class="fa-solid fa-exclamation-circle text-6xl text-red-300 mb-4" aria-hidden="true"></i>
      <h3 class="font-serif font-bold text-xl text-slate-900 mb-2">Error</h3>
      <p class="text-slate-600 mb-4">${escapeHtml(message)}</p>
      <button
        data-error-reload
        class="bg-slate-900 text-white px-6 py-3 hover:bg-slate-800 transition-colors"
        style="border: 2px solid var(--aucto-border-dark)"
      >
        Reload Page
      </button>
    </div>
  `;

  container
    .querySelector('[data-error-reload]')
    ?.addEventListener('click', () => window.location.reload());
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCollectionPage);
} else {
  initCollectionPage();
}
