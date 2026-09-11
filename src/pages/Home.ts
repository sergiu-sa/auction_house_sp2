import { CatalogStateManager } from '../utils/catalogState';
import { announce } from '../utils/announce';
import { highestBid } from '../utils/biddingStats';
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
import { isLoggedIn, profileHref } from '../utils/auth';
import { formatTimeRemaining } from '../utils/formatDate';
import { generateResponsiveImageAttrs } from '../utils/imageOptimization';
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
import { initLotImageFallbacks, lotImageSource } from '../utils/listingImage';
import { escapeHtml } from '../utils/escapeHtml';
import { formatCount, formatCurrency } from '../utils/formatCurrency';

// Hero mosaic sizes: tiles are third of column, not full-width card presets.
const HERO_MAIN_SIZES =
  '(max-width: 1023px) 80vw, (max-width: 1279px) 32vw, 420px';
const HERO_TILE_SIZES =
  '(max-width: 1023px) 40vw, (max-width: 1279px) 15vw, 200px';

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
  syncCatalogFilterBar(catalogManager.getState(), CATALOG_DEFAULTS, total);
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
  catalogManager.seedSearchFromUrl();

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

    renderCollectionCards(result.listings, 'catalog-cards');

    mountNextPageCell({
      containerId: 'catalog-cards',
      currentPage: state.page,
      totalPages: result.pageCount,
      cardCount: result.listings.length,
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
    editablePageNumber: true,
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

  if (featured.length === 0) {
    heroMosaic.innerHTML = `
      <div class="col-span-full flex items-center justify-center p-12 bg-slate-50" style="border: 3px solid var(--aucto-border-dark)">
        <p class="text-slate-600">No featured listings available at this time.</p>
      </div>
    `;
    return;
  }

  // Main featured listing
  const main = featured[0];
  const secondary = featured.slice(1);
  const mainSource = lotImageSource(main.media, main.title);
  const mainImgAttrs = generateResponsiveImageAttrs(
    mainSource.src,
    mainSource.alt,
    'landscape',
    HERO_MAIN_SIZES
  );
  const mainHighestBid = highestBid(main.bids);
  const mainTimeRemaining = formatTimeRemaining(main.endsAt);

  // The mosaic's card titles are h3, directly under the hero h1.
  // Naming the group restores the level the outline was skipping;
  //  it is sr-only because the hero already reads as one visually.
  let mosaicHTML = `
    <h2 class="sr-only">Featured auctions</h2>
    <!-- Main featured lot -->
    <article class="${secondary.length === 0 ? 'row-span-2' : 'row-span-1'} bg-slate-50" style="border: 3px solid var(--aucto-border-dark)">
      <div class="relative h-40 sm:h-48 md:h-52 bg-slate-200" style="border-bottom: 3px solid var(--aucto-border-dark)">
        <a href="/listing.html?id=${main.id}" class="block h-full">
          <img
            src="${escapeHtml(mainImgAttrs.src)}"
            ${mainImgAttrs.srcset ? `srcset="${escapeHtml(mainImgAttrs.srcset)}"` : ''}
            alt="${escapeHtml(mainImgAttrs.alt)}"
            sizes="${mainImgAttrs.sizes}"
            loading="eager"
            decoding="${mainImgAttrs.decoding}"
            class="h-full w-full object-cover"
            referrerpolicy="no-referrer"
            data-lot-image
          />
        </a>
        <div class="absolute left-4 top-4 bg-slate-900 px-3 py-1 text-[11px] font-bold tracking-[0.18em] uppercase text-white inline-flex items-center gap-1.5">
          <i class="fa-solid fa-fire text-amber-400" aria-hidden="true"></i>
          <span>Hot</span>
        </div>
        <div class="absolute right-4 bottom-4 bg-white px-3 py-1 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-900" style="border: 2px solid var(--aucto-border-dark)">
          ${mainTimeRemaining}
        </div>
      </div>
      <div class="p-5 md:p-6">
        <h3 class="mb-1 text-xl font-bold leading-tight text-slate-900">
          <a href="/listing.html?id=${main.id}" class="hover:underline">
            ${escapeHtml(main.title)}
          </a>
        </h3>
        <p class="mb-4 text-xs text-slate-600">
          Current bid
          <span class="font-semibold text-slate-900 inline-flex items-center gap-1">
            <i class="fa-solid fa-coins text-xs" aria-hidden="true"></i>
            <span>${formatCurrency(mainHighestBid)}</span>
          </span>
          ·
          <span class="inline-flex items-center gap-1">
            <i class="fa-solid fa-gavel text-xs" aria-hidden="true"></i>
            <span>${main._count?.bids || 0} bids</span>
          </span>
        </p>
        <div class="flex items-center justify-between text-xs text-slate-500">
          ${main.seller?.name ? `<a href="${profileHref(main.seller.name)}" class="hover:text-slate-900 transition-colors"${isLoggedIn() ? '' : ` aria-label="@${escapeHtml(main.seller.name)} (login required)"`}>@${escapeHtml(main.seller.name)}</a>` : '<span>@Unknown</span>'}
        </div>
      </div>
    </article>
  `;

  // The secondary tiles, however many came back. One of them must not sit in a two-column
  //  track with a hole beside it, and none of them means the main lot takes both rows.
  if (secondary.length > 0) {
    mosaicHTML += `<div class="grid ${secondary.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-4">`;

    for (const listing of secondary) {
      const tileSource = lotImageSource(listing.media, listing.title);
      const tileImgAttrs = generateResponsiveImageAttrs(
        tileSource.src,
        tileSource.alt,
        'square',
        HERO_TILE_SIZES
      );
      const currentHighest = highestBid(listing.bids);

      mosaicHTML += `
        <article class="bg-slate-50" style="border: 3px solid var(--aucto-border-dark)">
          <div class="h-48 sm:h-52 md:h-56 bg-slate-200" style="border-bottom: 3px solid var(--aucto-border-dark)">
            <a href="/listing.html?id=${listing.id}" class="block h-full">
              <img
                src="${escapeHtml(tileImgAttrs.src)}"
                ${tileImgAttrs.srcset ? `srcset="${escapeHtml(tileImgAttrs.srcset)}"` : ''}
                alt="${escapeHtml(tileImgAttrs.alt)}"
                sizes="${tileImgAttrs.sizes}"
                loading="${tileImgAttrs.loading}"
                decoding="${tileImgAttrs.decoding}"
                class="h-full w-full object-cover"
                referrerpolicy="no-referrer"
                data-lot-image
              />
            </a>
          </div>
          <div class="p-2.5 sm:p-3">
            <h4 class="mb-1 text-sm font-bold text-slate-900 line-clamp-2">
              <a href="/listing.html?id=${listing.id}" class="hover:underline">
                ${escapeHtml(listing.title.length > 30 ? listing.title.substring(0, 30) + '...' : listing.title)}
              </a>
            </h4>
            <p class="text-[11px] text-slate-600">${formatCurrency(currentHighest)}</p>
          </div>
        </article>
      `;
    }

    mosaicHTML += `</div>`;
  }

  heroMosaic.innerHTML = mosaicHTML;
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
