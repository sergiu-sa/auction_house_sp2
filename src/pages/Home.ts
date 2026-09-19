import {
  CATALOG_STATE_DEFAULTS,
  CatalogStateManager,
} from '../utils/catalogState';
import type { CatalogFilterState } from '../utils/catalogState';
import { serializeCatalogState } from '../utils/catalogUrl';
import { announce } from '../utils/announce';
import {
  activePool,
  catalogPage,
  endingSoon,
  featuredWithImages,
  newest,
  trending,
} from '../api/listingQueries';
import { renderHeader } from '../components/Navbar';
import { renderFooter } from '../components/Footer';
import {
  renderProductCards,
  showProductCardSkeletons,
} from '../components/ProductCard';
import {
  renderQuickCards,
  showQuickCardSkeletons,
} from '../components/QuickCard';
import {
  renderCollectionCards,
  showCollectionCardSkeletons,
} from '../components/CollectionCard';
import { renderPagination } from '../components/PaginationComponent';
import { mountNextPageCell } from '../components/NextPageCell';
import { focusResultsGrid } from '../utils/focusResultsGrid';
import { toast } from '../components/Toast';
import { isLoggedIn } from '../utils/auth';
import {
  addStructuredData,
  generateWebsiteStructuredData,
  generateOrganizationStructuredData,
} from '../utils/seo';
import { logError } from '../utils/logger';
import type { Listing } from '../types/api';
import {
  renderCatalogFilterBar,
  initCatalogFilterBar,
  syncCatalogFilterBar,
  collapseCatalogFilterBar,
} from '../components/filters';
import { initLotImageFallbacks } from '../utils/listingImage';
import { formatCount } from '../utils/formatCurrency';
import { renderHeroMosaic } from '../components/HeroMosaic';

// One wide lot and two tiles beneath; height stays constant.
const HERO_TILE_COUNT = 3;

// State management for catalog section
// 11, not 12: the 12th grid cell is the next-page control. See Collection.ts.
const catalogManager = new CatalogStateManager(
  { sort: 'endsAt', sortOrder: 'asc', itemsPerPage: 11 },
  loadCatalogListings
);

/** The filters this page starts on, for counting how many the reader has since changed. */
const CATALOG_DEFAULTS = catalogManager.getState();
let catalogRequestId = 0;
function syncFilterBarWithState(total?: number): void {
  const state = catalogManager.getState();
  syncCatalogFilterBar(state, CATALOG_DEFAULTS, total);
  updateFullCatalogLink(state);
}

/**
 * Point "View Full Catalog" at the catalog the reader is actually looking at.
 *
 * It sits above the grid the filter bar drives, and as a bare `/collection.html` it threw away
 * whatever had been typed: search on Home, follow the link, land on all 3,199 lots with an empty
 * box. The three other `/collection.html` links in this page's own markup stay bare on purpose —
 * they belong to the hero, Trending and New Listings, which this bar does not filter, so carrying
 * the catalog's filters there would describe a set those sections never showed. The rendered page
 * holds eight in all; the remaining four are the navbar's and the footer's, which are site chrome
 * and belong to no page's filters.
 *
 * Two things it does differently from the address-bar writer:
 *
 * `page` is dropped. Home paginates 11 to a page and Collection 23, so Home's page 4 is lots 34-44
 * and Collection's is 70-92; carrying the number over would land the reader on lots they never saw.
 *
 * The yardstick is the catalog's resting filters rather than Home's. Home rests on `endsAt asc`, so
 * measuring against its own defaults would leave the sort out for a reader who never touched it and
 * drop them onto a `created desc` grid in a different order from the one they were just reading.
 */
function updateFullCatalogLink(state: CatalogFilterState): void {
  const link = document.getElementById('view-full-catalog');
  if (!link) return;

  link.setAttribute(
    'href',
    `/collection.html${serializeCatalogState({ ...state, page: 1 }, CATALOG_STATE_DEFAULTS)}`
  );
}

async function initHomePage(): Promise<void> {
  // Render header and footer (header includes guest banner)
  renderHeader();
  renderFooter();

  // Add structured data for SEO
  addStructuredData(generateWebsiteStructuredData());
  addStructuredData(generateOrganizationStructuredData());

  // Show login required message for create listing button if not logged in
  setupCreateListingButton();

  // Listen for the catalog bar's filter events
  catalogManager.listenToFilterEvents();

  const host = document.getElementById('catalog-filter-bar-host');
  if (host) {
    host.outerHTML = renderCatalogFilterBar();
    initCatalogFilterBar();
  }

  // Before the first load, so the term is part of the query rather than a second fetch after it.
  catalogManager.seedFromUrl();

  // Load all data
  await loadAllData();
}

function setupCreateListingButton(): void {
  const createListingBtn = document.getElementById('create-listing-btn');
  if (!createListingBtn) return;

  if (!isLoggedIn()) {
    createListingBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toast.error('Please log in to create a listing');
      setTimeout(() => {
        window.location.href = '/login.html?redirect=/listing-create.html';
      }, 1500);
    });
  }
}

/**
 * The hero, trending and new-listings sections all describe live auctions, so they share one fetch of the active pool rather than each ranking a window of the newest listings;
 *    which is only ~2% active and left every section near-empty.
 */
async function loadAllData(): Promise<void> {
  // Started before the pool, not after it: neither reads it, both run their own query, and both handle their own failures.
  // Queued behind it they would inherit its latency and be blanked by its catch.
  loadCatalogListings();
  renderEndingSoonSection();

  try {
    const pool = await activePool();

    if (pool.length === 0) {
      showNoListingsMessage();
      return;
    }

    // Hero last: it verifies each candidate's photograph over the network, while these two need
    //  nothing but `pool` and would sit as skeletons behind it.
    await renderTrendingSection(pool);
    await renderNewListingsSection(pool);
    await renderHeroSection(pool);
  } catch (error) {
    logError('Failed to load home page data', error);
    toast.error('Failed to load listings. Please refresh the page.');
    showErrorInSections();
  }
}

/**
 * Reload the catalog grid only, leaving the sections above it untouched.
 *
 * Every filter is part of the query now, so each change is a round trip rather than a re-slice of whatever happened to be fetched first.
 */
async function loadCatalogListings(): Promise<void> {
  syncFilterBarWithState();
  const requestId = ++catalogRequestId;
  const state = catalogManager.getState();

  try {
    showCollectionCardSkeletons(
      // +1 for the next-page cell — see Collection.ts.
      state.itemsPerPage + 1,
      'catalog-cards'
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
    if (requestId !== catalogRequestId) return;

    // A URL is the one way onto a page past the end of the set, because the ceiling is not known
    // until this answers. Moving refetches, so there is nothing to render here.
    if (catalogManager.clampToPageCount(result.pageCount)) return;

    renderCollectionCards(result.listings, 'catalog-cards');

    mountNextPageCell({
      containerId: 'catalog-cards',
      currentPage: state.page,
      totalPages: result.pageCount,
      cardCount: result.listings.length,
      itemsPerPage: state.itemsPerPage,
      totalCount: result.totalCount,
      onPageChange: goToCatalogPage,
    });
    renderCatalogPagination(result.pageCount);
    syncFilterBarWithState(result.totalCount);

    // The catalog swaps out without a page load, so nothing here is otherwise announced.
    const total = formatCount(result.totalCount);
    announce(
      `${total} ${result.totalCount === 1 ? 'listing' : 'listings'} found. Page ${state.page} of ${result.pageCount || 1}.`
    );
  } catch (error) {
    if (requestId !== catalogRequestId) return;

    logError('Failed to load catalog listings', error);
    toast.error('Failed to update the catalog. Please try again.');

    // Never leave the grid stuck on skeletons
    renderCollectionCards([], 'catalog-cards');
  }
}

/** One definition of what paging does — see Collection.ts for why the collapse comes first. */
function goToCatalogPage(page: number): void {
  catalogManager.updatePage(page);
  collapseCatalogFilterBar();
  focusResultsGrid('catalog-cards');
}

function renderCatalogPagination(totalPages: number): void {
  renderPagination({
    containerId: 'catalog-pagination',
    variant: 'positional',
    currentPage: catalogManager.getState().page,
    totalPages,
    onPageChange: goToCatalogPage,
  });
}

function showNoListingsMessage(): void {
  const noDataHTML = `
    <div class="col-span-full text-center py-12">
      <i class="fa-solid fa-box-open text-6xl text-slate-300 mb-4" aria-hidden="true"></i>
      <h3 class="font-serif font-bold text-xl text-slate-900 mb-2">No Listings Available</h3>
      <p class="text-slate-600">Check back soon for new auctions.</p>
    </div>
  `;

  // Only the sections fed by the active pool.
  // Ending Soon and the catalog run their own queries and render their own empty states, and writing here would race them.
  const sections = ['trending-cards', 'new-listings-cards'];
  sections.forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.innerHTML = noDataHTML;
  });

  // Hero section special handling
  const heroMosaic = document.getElementById('hero-mosaic');
  if (heroMosaic) {
    heroMosaic.innerHTML = `
      <div class="flex items-center justify-center p-12 bg-slate-50" style="border: 3px solid var(--aucto-border-dark)">
        <p class="text-slate-600">No featured listings available at this time.</p>
      </div>
    `;
  }
}

function showErrorInSections(): void {
  const errorHTML = `
    <div class="col-span-full text-center py-12">
      <i class="fa-solid fa-exclamation-triangle text-6xl text-red-300 mb-4" aria-hidden="true"></i>
      <h3 class="font-serif font-bold text-xl text-slate-900 mb-2">Failed to Load</h3>
      <p class="text-slate-600 mb-4">Unable to fetch auction listings. Please try again later.</p>
      <button
        data-error-reload
        class="bg-slate-900 text-white px-6 py-3 hover:bg-slate-800 transition-colors"
        style="border: 2px solid var(--aucto-border-dark)"
      >
        Reload Page
      </button>
    </div>
  `;

  const sections = ['hero-mosaic', 'trending-cards', 'new-listings-cards'];
  sections.forEach((id) => {
    const element = document.getElementById(id);
    if (!element) return;
    element.innerHTML = errorHTML;
    // Per element, not by id: the same markup goes into all three sections.
    element
      .querySelector('[data-error-reload]')
      ?.addEventListener('click', () => window.location.reload());
  });
}

async function renderHeroSection(pool: Listing[]): Promise<void> {
  const heroMosaic = document.getElementById('hero-mosaic');
  const heroActiveCount = document.getElementById('hero-active-count');
  const heroBidsCount = document.getElementById('hero-bids-count');

  if (!heroMosaic) return;

  // Both stats describe the platform, so they count the whole active pool.
  if (heroActiveCount) {
    heroActiveCount.textContent = formatCount(pool.length);
  }

  if (heroBidsCount) {
    const totalBids = pool.reduce(
      (sum, listing) => sum + (listing._count?.bids || 0),
      0
    );
    heroBidsCount.textContent = formatCount(totalBids);
  }

  const featured = await featuredWithImages(HERO_TILE_COUNT, pool);

  heroMosaic.innerHTML = renderHeroMosaic(featured);
  initLotImageFallbacks(heroMosaic);
}

// Trending = active listings sorted by bid count
async function renderTrendingSection(pool: Listing[]): Promise<void> {
  const hottest = await trending(3, pool);

  showProductCardSkeletons(3, 'trending-cards');

  setTimeout(() => {
    renderProductCards(hottest, 'trending-cards');
  }, 300);
}

async function renderNewListingsSection(pool: Listing[]): Promise<void> {
  const newListings = await newest(3, pool);

  showProductCardSkeletons(3, 'new-listings-cards');

  setTimeout(() => {
    renderProductCards(newListings, 'new-listings-cards');
  }, 400);
}

/**
 * The active lots closest to closing.
 *
 * This is a rank, not a fixed time window.
 * A window renders empty whenever nothing happens to be closing inside it, which leaves the section dead most of the time;
 *  the cards print the real countdown, so nothing is overstated.
 */
async function renderEndingSoonSection(): Promise<void> {
  // Inside the try:
  //  nothing awaits this call, so anything thrown out here would be an unhandled rejection rather than a logged failure.
  try {
    showQuickCardSkeletons(4, 'ending-soon-cards');

    renderQuickCards(await endingSoon(4), 'ending-soon-cards');
  } catch (error) {
    logError('Failed to load ending soon listings', error);
    renderQuickCards([], 'ending-soon-cards');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHomePage);
} else {
  initHomePage();
}
