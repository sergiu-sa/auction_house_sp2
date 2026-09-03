import { CatalogStateManager } from '../utils/catalogState';
import { announce } from '../utils/announce';
import { prefersReducedMotion } from '../utils/motion';
import { highestBid } from '../utils/biddingStats';
import {
  activePool,
  catalogPage,
  endingSoon,
  featuredActive,
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
import { toast } from '../components/Toast';
import { isLoggedIn } from '../utils/auth';
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
  renderSearchField,
  renderCategoryFilters,
  renderActiveOnlyCheckbox,
  renderSortDropdown,
  initSearchField,
  initCategoryFilters,
  initActiveOnlyCheckbox,
  initSortDropdown,
  setSearchFieldValue,
  setActiveCategory,
  setActiveOnlyState,
  setSortValue,
} from '../components/filters';
import { escapeHtml } from '../utils/escapeHtml';

/**
 * The hero mosaic is not a card, so none of the three presets in `imageOptimization.ts` describes it:
 *   its tiles are a third of a column, not a full-width item.
 * Measured rendered widths — main 196/288/612/420 and tile 87/133/295/199 at 320/412/768/1440, so the defaults' `100vw` was asking for a 1074px original to fill a 133px box.
 *
 * These images take no `width`/`height`, unlike the cards: the container fixes both dimensions and the image is `h-full w-full object-cover`, so the attributes would never apply, and the presets' numbers describe a squarer box than either of these actually is.
 * The main tile also overrides the helper's `lazy`, as `ListingDetail` does for its own main image:
 *  it sits inside the initial viewport above `lg`, which is the one case `lazy` is not for.
 */
const HERO_MAIN_SIZES =
  '(max-width: 1023px) 80vw, (max-width: 1279px) 32vw, 420px';
const HERO_TILE_SIZES =
  '(max-width: 1023px) 40vw, (max-width: 1279px) 15vw, 200px';

// State management for catalog section
const catalogManager = new CatalogStateManager(
  { sort: 'endsAt', sortOrder: 'asc' },
  loadCatalogListings
);
let catalogRequestId = 0;
function initStickyFilterBar(): void {
  const stickyBar = document.getElementById('sticky-catalog-filters');
  const catalogSection =
    document.querySelector('#catalog-cards')?.parentElement;

  if (!stickyBar || !catalogSection) return;

  // Render sticky filter bar content using components
  stickyBar.innerHTML = `
    <div class="mx-auto max-w-7xl px-6 py-4 md:px-8">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <!-- Left: Label + Search -->
        <div class="flex items-center gap-3 flex-1">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-layer-group text-slate-700" aria-hidden="true"></i>
            <span class="text-sm font-bold text-slate-900">Catalog Filters</span>
          </div>
          <div class="max-w-md">
            ${renderSearchField({ id: 'sticky-search-input', placeholder: 'Search catalog...', variant: 'compact' })}
          </div>
        </div>

        <!-- Right: Category Filters + Active Only + Sort -->
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
          ${renderCategoryFilters({ dataAttribute: 'data-sticky-filter', variant: 'compact' })}

          <div class="flex flex-wrap items-center gap-3 text-sm">
            ${renderActiveOnlyCheckbox({ id: 'sticky-active-only', variant: 'compact' })}
            ${renderSortDropdown({ id: 'sticky-sort-select', variant: 'compact', label: 'Sort listings, sticky filter bar' })}

            <!-- Close button -->
            <button
              id="sticky-close-btn"
              type="button"
              class="lg:hidden text-slate-500 hover:text-slate-900 px-2"
              aria-label="Close filters"
            >
              <i class="fa-solid fa-xmark text-lg" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  let isSticky = false;

  // Scroll handler to show/hide sticky bar
  function handleScroll() {
    if (!stickyBar || !catalogSection) return;

    const catalogRect = catalogSection.getBoundingClientRect();
    const shouldShow = catalogRect.top <= 100; // Show when catalog section is near top

    if (shouldShow && !isSticky) {
      // Show sticky bar
      stickyBar.classList.remove('-translate-y-full');
      stickyBar.classList.add('translate-y-0');
      isSticky = true;
    } else if (!shouldShow && isSticky) {
      // Hide sticky bar
      stickyBar.classList.remove('translate-y-0');
      stickyBar.classList.add('-translate-y-full');
      isSticky = false;
    }
  }

  // Throttle the scroll handler:
  //  run on the leading edge, then ignore events until the window passes.
  // Clearing and re-arming instead would be a debounce, and scroll events arrive about once a frame;
  //  — on a 120Hz display that is every 8ms, so the timer would be cleared before it ever fired and the sticky bar would only appear once the user stopped scrolling.
  let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
  window.addEventListener('scroll', () => {
    if (scrollTimeout !== null) return;
    scrollTimeout = setTimeout(() => {
      scrollTimeout = null;
      window.requestAnimationFrame(handleScroll);
    }, 10);
  });

  // Initialize sticky filter event listeners using components
  initStickyFilterEvents();
}

function initStickyFilterEvents(): void {
  // Initialize search field using component
  initSearchField('sticky-search-input', 300);

  // Also sync with navbar search when user types in sticky search
  const stickySearchInput = document.getElementById(
    'sticky-search-input'
  ) as HTMLInputElement;
  if (stickySearchInput) {
    stickySearchInput.addEventListener('input', () => {
      const navbarSearch = document.getElementById(
        'global-search-input'
      ) as HTMLInputElement;
      if (navbarSearch) navbarSearch.value = stickySearchInput.value;
    });
  }

  // Initialize category filters using component
  initCategoryFilters('data-sticky-filter');

  // Initialize active-only checkbox using component
  initActiveOnlyCheckbox('sticky-active-only');

  // Initialize sort dropdown using component
  initSortDropdown('sticky-sort-select');

  // Sticky close button
  const stickyCloseBtn = document.getElementById('sticky-close-btn');
  if (stickyCloseBtn) {
    stickyCloseBtn.addEventListener('click', () => {
      const stickyBar = document.getElementById('sticky-catalog-filters');
      if (stickyBar) {
        stickyBar.classList.remove('translate-y-0');
        stickyBar.classList.add('-translate-y-full');
      }
    });
  }
}

function syncFilterBarsWithState(): void {
  const state = catalogManager.getState();

  setSearchFieldValue('sticky-search-input', state.search);
  setActiveCategory('data-sticky-filter', state.category);
  setActiveOnlyState('sticky-active-only', state.activeOnly);
  setSortValue('sticky-sort-select', state.sort, state.sortOrder);

  // The navbar renders its own copy of these controls with its own defaults, so without this the two visible filter bars disagree;
  //  from first paint for sort, and after any sticky-bar change for the rest.
  // Search is deliberately not synced here: the input is debounced, and writing to it mid-type would clobber keystrokes made while a load was in flight.
  setActiveCategory('data-filter', state.category);
  setActiveOnlyState('active-only-filter', state.activeOnly);
  setSortValue('sort-filter-select', state.sort, state.sortOrder);
}

async function initHomePage(): Promise<void> {
  // Render header and footer (header includes guest banner)
  await renderHeader();
  renderFooter();

  // Add structured data for SEO
  addStructuredData(generateWebsiteStructuredData());
  addStructuredData(generateOrganizationStructuredData());

  // Show login required message for create listing button if not logged in
  setupCreateListingButton();

  // Listen to navbar filter events
  catalogManager.listenToNavbarFilters();

  // Initialize sticky catalog filters
  initStickyFilterBar();

  applyInitialSearchFromUrl();

  // Load all data
  await loadAllData();
}

/**
 * A search started on another page arrives as `?q=`.
 * Without this the navigation lands here, the term is dropped and the catalog renders unfiltered.
 */
function applyInitialSearchFromUrl(): void {
  const query = new URLSearchParams(window.location.search).get('q')?.trim();
  if (!query) return;

  catalogManager.seedState({ search: query });
  setSearchFieldValue('sticky-search-input', query);
  setSearchFieldValue('global-search-input', query);
  setSearchFieldValue('mobile-search-input', query);
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

    await renderHeroSection(pool);
    await renderTrendingSection(pool);
    await renderNewListingsSection(pool);
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
  syncFilterBarsWithState();
  const requestId = ++catalogRequestId;
  const state = catalogManager.getState();

  try {
    showCollectionCardSkeletons(state.itemsPerPage, 'catalog-cards');

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
    renderCatalogPagination(result.pageCount);

    // The catalog swaps out without a page load, so nothing here is otherwise announced.
    const total = new Intl.NumberFormat('en-US').format(result.totalCount);
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

function renderCatalogPagination(totalPages: number): void {
  renderPagination({
    containerId: 'catalog-pagination',
    currentPage: catalogManager.getState().page,
    totalPages,
    onPageChange: (page: number) => {
      catalogManager.updatePage(page);

      // Scroll to catalog section, and take focus with it — see Collection.ts.
      const catalogSection = document.getElementById('catalog-cards');
      if (catalogSection) {
        catalogSection.scrollIntoView({
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'start',
        });
        catalogSection.setAttribute('tabindex', '-1');
        catalogSection.focus({ preventScroll: true });
      }
    },
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
    heroActiveCount.textContent = pool.length.toLocaleString();
  }

  if (heroBidsCount) {
    const totalBids = pool.reduce(
      (sum, listing) => sum + (listing._count?.bids || 0),
      0
    );
    heroBidsCount.textContent = totalBids.toLocaleString();
  }

  const featured = await featuredActive(3, pool);

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
  const mainImage = main.media?.[0]?.url || '/images/placeholder.svg';
  const mainImgAttrs = generateResponsiveImageAttrs(
    mainImage,
    main.title,
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
    <article class="row-span-1 bg-slate-50" style="border: 3px solid var(--aucto-border-dark)">
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
            <span>${mainHighestBid} credits</span>
          </span>
          ·
          <span class="inline-flex items-center gap-1">
            <i class="fa-solid fa-gavel text-xs" aria-hidden="true"></i>
            <span>${main._count?.bids || 0} bids</span>
          </span>
        </p>
        <div class="flex items-center justify-between text-xs text-slate-500">
          ${main.seller?.name ? `<a href="/profile.html?user=${encodeURIComponent(main.seller.name)}" class="hover:text-slate-900 transition-colors">@${escapeHtml(main.seller.name)}</a>` : '<span>@Unknown</span>'}
        </div>
      </div>
    </article>
  `;

  // Two secondary listings
  if (featured.length >= 2) {
    mosaicHTML += `<div class="grid grid-cols-2 gap-4">`;

    for (let i = 1; i < Math.min(featured.length, 3); i++) {
      const listing = featured[i];
      const image = listing.media?.[0]?.url || '/images/placeholder.svg';
      const tileImgAttrs = generateResponsiveImageAttrs(
        image,
        listing.title,
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
              />
            </a>
          </div>
          <div class="p-2.5 sm:p-3">
            <h4 class="mb-1 text-sm font-bold text-slate-900 line-clamp-2">
              <a href="/listing.html?id=${listing.id}" class="hover:underline">
                ${escapeHtml(listing.title.length > 30 ? listing.title.substring(0, 30) + '...' : listing.title)}
              </a>
            </h4>
            <p class="text-[11px] text-slate-600">${currentHighest} credits</p>
          </div>
        </article>
      `;
    }

    mosaicHTML += `</div>`;
  }

  heroMosaic.innerHTML = mosaicHTML;
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
