import { getListings } from '../api/listings';
import { renderHeader } from '../components/navbar';
import { renderFooter } from '../components/Footer';
import { renderProductCards, showProductCardSkeletons } from '../components/ProductCard';
import { renderQuickCards, showQuickCardSkeletons } from '../components/QuickCard';
import { renderCollectionCards } from '../components/CollectionCard';
import { renderPagination } from '../components/PaginationComponent';
import { toast } from '../components/Toast';
import { isLoggedIn } from '../utils/auth';
import { formatTimeRemaining } from '../utils/formatDate';
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

// State management for catalog section
interface CatalogState {
  category: string;
  sort: string;
  sortOrder: 'asc' | 'desc';
  activeOnly: boolean;
  search: string;
  page: number;
  itemsPerPage: number;
}

let allListings: Listing[] = [];
let catalogState: CatalogState = {
  category: 'all',
  sort: 'endsAt',
  sortOrder: 'asc',
  activeOnly: false,
  search: '',
  page: 1,
  itemsPerPage: 12,
};

/**
 * Listen to navbar filter events
 */
function listenToNavbarFilters(): void {
  // Category filter from navbar
  document.addEventListener('categoryFilterChange', ((e: CustomEvent) => {
    catalogState.category = e.detail.category;
    catalogState.page = 1; // Reset to first page
    applyCatalogFilters();
    syncStickyFiltersWithState();
  }) as EventListener);

  // Search from navbar
  document.addEventListener('globalSearchInput', ((e: CustomEvent) => {
    catalogState.search = e.detail.query;
    catalogState.page = 1; // Reset to first page
    applyCatalogFilters();
    syncStickyFiltersWithState();
  }) as EventListener);

  // Active only checkbox from navbar
  document.addEventListener('activeOnlyChange', ((e: CustomEvent) => {
    catalogState.activeOnly = e.detail.activeOnly;
    catalogState.page = 1; // Reset to first page
    applyCatalogFilters();
    syncStickyFiltersWithState();
  }) as EventListener);

  // Sort from navbar
  document.addEventListener('sortChange', ((e: CustomEvent) => {
    catalogState.sort = e.detail.sort;
    catalogState.sortOrder = e.detail.order;
    catalogState.page = 1; // Reset to first page
    applyCatalogFilters();
    syncStickyFiltersWithState();
  }) as EventListener);
}

/**
 * Initialize sticky filter bar with scroll detection and event handlers
 */
function initStickyFilterBar(): void {
  const stickyBar = document.getElementById('sticky-catalog-filters');
  const catalogSection = document.querySelector('#catalog-cards')?.parentElement;

  if (!stickyBar || !catalogSection) return;

  // Render sticky filter bar content using components
  stickyBar.innerHTML = `
    <div class="mx-auto max-w-7xl px-6 py-4 md:px-8">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <!-- Left: Label + Search -->
        <div class="flex items-center gap-3 flex-1">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-layer-group text-slate-700"></i>
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
            ${renderSortDropdown({ id: 'sticky-sort-select', variant: 'compact' })}

            <!-- Close button -->
            <button
              id="sticky-close-btn"
              type="button"
              class="lg:hidden text-slate-500 hover:text-slate-900 px-2"
              aria-label="Close filters"
            >
              <i class="fa-solid fa-xmark text-lg"></i>
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

  // Throttle scroll event for better performance
  let scrollTimeout: ReturnType<typeof setTimeout>;
  window.addEventListener('scroll', () => {
    if (scrollTimeout) {
      window.cancelAnimationFrame(scrollTimeout as unknown as number);
    }
    scrollTimeout = setTimeout(() => {
      window.requestAnimationFrame(handleScroll);
    }, 10);
  });

  // Initialize sticky filter event listeners using components
  initStickyFilterEvents();
}

/**
 * Initialize event listeners for sticky filter bar
 */
function initStickyFilterEvents(): void {
  // Initialize search field using component
  initSearchField('sticky-search-input', 300);

  // Also sync with navbar search when user types in sticky search
  const stickySearchInput = document.getElementById('sticky-search-input') as HTMLInputElement;
  if (stickySearchInput) {
    stickySearchInput.addEventListener('input', () => {
      const navbarSearch = document.getElementById('global-search-input') as HTMLInputElement;
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

/**
 * Sync sticky filter bar with current state
 */
function syncStickyFiltersWithState(): void {
  // Sync search input using component
  setSearchFieldValue('sticky-search-input', catalogState.search);

  // Sync category buttons using component
  setActiveCategory('data-sticky-filter', catalogState.category);

  // Sync active only checkbox using component
  setActiveOnlyState('sticky-active-only', catalogState.activeOnly);

  // Sync sort select using component
  setSortValue('sticky-sort-select', catalogState.sort, catalogState.sortOrder);
}

/**
 * Initialize home page
 */
async function initHomePage(): Promise<void> {
  // Render header and footer (header includes guest banner)
  await renderHeader();
  renderFooter();

  // Show login required message for create listing button if not logged in
  setupCreateListingButton();

  // Listen to navbar filter events
  listenToNavbarFilters();

  // Initialize sticky catalog filters
  initStickyFilterBar();

  // Load all data
  await loadAllData();
}

/**
 * Setup create listing button behavior
 */
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
 * Load all data for the home page
 */
async function loadAllData(): Promise<void> {
  try {
    // Fetch all listings
    const response = await getListings({
      limit: 100,
      _seller: true,
      _bids: true,
      sort: 'created',
      sortOrder: 'desc',
    });

    if (response.data && response.data.length > 0) {
      allListings = response.data;

      // Render all sections
      renderHeroSection();
      renderTrendingSection();
      renderNewListingsSection();
      renderEndingSoonSection();
      renderCatalogSection();
    } else {
      showNoListingsMessage();
    }
  } catch (error) {
    console.error('Error loading data:', error);
    toast.error('Failed to load listings. Please refresh the page.');
    showErrorInSections();
  }
}

/**
 * Show no listings message in all sections
 */
function showNoListingsMessage(): void {
  const noDataHTML = `
    <div class="col-span-full text-center py-12">
      <i class="fa-solid fa-box-open text-6xl text-slate-300 mb-4"></i>
      <h3 class="font-serif font-bold text-xl text-slate-900 mb-2">No Listings Available</h3>
      <p class="text-slate-600">Check back soon for new auctions.</p>
    </div>
  `;

  const sections = ['trending-cards', 'new-listings-cards', 'ending-soon-cards', 'catalog-cards'];
  sections.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.innerHTML = noDataHTML;
  });

  // Hero section special handling
  const heroMosaic = document.getElementById('hero-mosaic');
  if (heroMosaic) {
    heroMosaic.innerHTML = `
      <div class="flex items-center justify-center p-12 bg-slate-50" style="border: 3px solid #1e293b">
        <p class="text-slate-600">No featured listings available at this time.</p>
      </div>
    `;
  }
}

/**
 * Show error message in all sections
 */
function showErrorInSections(): void {
  const errorHTML = `
    <div class="col-span-full text-center py-12">
      <i class="fa-solid fa-exclamation-triangle text-6xl text-red-300 mb-4"></i>
      <h3 class="font-serif font-bold text-xl text-slate-900 mb-2">Failed to Load</h3>
      <p class="text-slate-600 mb-4">Unable to fetch auction listings. Please try again later.</p>
      <button
        onclick="window.location.reload()"
        class="bg-slate-900 text-white px-6 py-3 hover:bg-slate-800 transition-colors"
        style="border: 2px solid #1e293b"
      >
        Reload Page
      </button>
    </div>
  `;

  const sections = ['hero-mosaic', 'trending-cards', 'new-listings-cards', 'ending-soon-cards', 'catalog-cards'];
  sections.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.innerHTML = errorHTML;
  });
}

/**
 * Render Hero Section with mosaic and stats
 */
function renderHeroSection(): void {
  const heroMosaic = document.getElementById('hero-mosaic');
  const heroActiveCount = document.getElementById('hero-active-count');
  const heroBidsCount = document.getElementById('hero-bids-count');

  if (!heroMosaic) return;

  // Get active listings only
  const now = new Date();
  const activeListings = allListings.filter(listing => new Date(listing.endsAt) > now);

  // Update stats
  if (heroActiveCount) {
    heroActiveCount.textContent = activeListings.length.toLocaleString();
  }

  if (heroBidsCount) {
    const totalBids = allListings.reduce((sum, listing) => sum + (listing._count?.bids || 0), 0);
    heroBidsCount.textContent = totalBids.toLocaleString();
  }

  // Get 3 featured listings with most bids
  const featured = [...activeListings]
    .sort((a, b) => (b._count?.bids || 0) - (a._count?.bids || 0))
    .slice(0, 3);

  if (featured.length === 0) {
    heroMosaic.innerHTML = `
      <div class="col-span-full flex items-center justify-center p-12 bg-slate-50" style="border: 3px solid #1e293b">
        <p class="text-slate-600">No featured listings available at this time.</p>
      </div>
    `;
    return;
  }

  // Main featured listing
  const main = featured[0];
  const mainImage = main.media?.[0]?.url || 'https://via.placeholder.com/900x600?text=No+Image';
  const mainBids = main.bids || [];
  const mainHighestBid = mainBids.length > 0 ? Math.max(...mainBids.map(b => b.amount)) : 0;
  const mainTimeRemaining = formatTimeRemaining(main.endsAt);

  let mosaicHTML = `
    <!-- Main featured lot -->
    <article class="row-span-1 bg-slate-50" style="border: 3px solid #1e293b">
      <div class="relative h-40 sm:h-48 md:h-52 bg-slate-200" style="border-bottom: 3px solid #1e293b">
        <a href="/listing.html?id=${main.id}" class="block h-full">
          <img
            src="${mainImage}"
            alt="${main.title}"
            class="h-full w-full object-cover"
          />
        </a>
        <div class="absolute left-4 top-4 bg-slate-900 px-3 py-1 text-[11px] font-bold tracking-[0.18em] uppercase text-white inline-flex items-center gap-1.5">
          <i class="fa-solid fa-fire text-amber-400"></i>
          <span>Hot</span>
        </div>
        <div class="absolute right-4 bottom-4 bg-white px-3 py-1 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-900" style="border: 2px solid #1e293b">
          ${mainTimeRemaining}
        </div>
      </div>
      <div class="p-5 md:p-6">
        <h3 class="mb-1 text-xl font-bold leading-tight text-slate-900">
          <a href="/listing.html?id=${main.id}" class="hover:underline">
            ${main.title}
          </a>
        </h3>
        <p class="mb-4 text-xs text-slate-600">
          Current bid
          <span class="font-semibold text-slate-900 inline-flex items-center gap-1">
            <i class="fa-solid fa-coins text-xs"></i>
            <span>${mainHighestBid} credits</span>
          </span>
          ·
          <span class="inline-flex items-center gap-1">
            <i class="fa-solid fa-gavel text-xs"></i>
            <span>${main._count?.bids || 0} bids</span>
          </span>
        </p>
        <div class="flex items-center justify-between text-xs text-slate-500">
          ${main.seller?.name ? `<a href="/profile.html?user=${main.seller.name}" class="hover:text-slate-900 transition-colors">@${main.seller.name}</a>` : '<span>@Unknown</span>'}
        </div>
      </div>
    </article>
  `;

  // Two secondary listings
  if (featured.length >= 2) {
    mosaicHTML += `<div class="grid grid-cols-2 gap-4">`;

    for (let i = 1; i < Math.min(featured.length, 3); i++) {
      const listing = featured[i];
      const image = listing.media?.[0]?.url || 'https://via.placeholder.com/600x400?text=No+Image';
      const bids = listing.bids || [];
      const highestBid = bids.length > 0 ? Math.max(...bids.map(b => b.amount)) : 0;

      mosaicHTML += `
        <article class="bg-slate-50" style="border: 3px solid #1e293b">
          <div class="h-48 sm:h-52 md:h-56 bg-slate-200" style="border-bottom: 3px solid #1e293b">
            <a href="/listing.html?id=${listing.id}" class="block h-full">
              <img
                src="${image}"
                alt="${listing.title}"
                class="h-full w-full object-cover"
              />
            </a>
          </div>
          <div class="p-2.5 sm:p-3">
            <h4 class="mb-1 text-sm font-bold text-slate-900 line-clamp-2">
              <a href="/listing.html?id=${listing.id}" class="hover:underline">
                ${listing.title.length > 30 ? listing.title.substring(0, 30) + '...' : listing.title}
              </a>
            </h4>
            <p class="text-[11px] text-slate-600">${highestBid} credits</p>
          </div>
        </article>
      `;
    }

    mosaicHTML += `</div>`;
  }

  heroMosaic.innerHTML = mosaicHTML;
}

/**
 * Render Trending Section (listings with most bids)
 */
function renderTrendingSection(): void {
  const now = new Date();
  const activeListings = allListings.filter(listing => new Date(listing.endsAt) > now);

  // Get top 3 listings by bid count
  const trending = [...activeListings]
    .filter(listing => (listing._count?.bids || 0) > 0)
    .sort((a, b) => (b._count?.bids || 0) - (a._count?.bids || 0))
    .slice(0, 3);

  showProductCardSkeletons(3, 'trending-cards');

  setTimeout(() => {
    renderProductCards(trending, 'trending-cards');
  }, 300);
}

/**
 * Render New Listings Section (newest listings)
 */
function renderNewListingsSection(): void {
  const now = new Date();
  const activeListings = allListings.filter(listing => new Date(listing.endsAt) > now);

  // Get 3 newest listings
  const newListings = [...activeListings]
    .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
    .slice(0, 3);

  showProductCardSkeletons(3, 'new-listings-cards');

  setTimeout(() => {
    renderProductCards(newListings, 'new-listings-cards');
  }, 400);
}

/**
 * Render Ending Soon Section (listings ending in next 24 hours)
 */
function renderEndingSoonSection(): void {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const endingSoon = allListings.filter(listing => {
    const endsAt = new Date(listing.endsAt);
    return endsAt >= now && endsAt <= tomorrow;
  }).sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime())
    .slice(0, 4);

  showQuickCardSkeletons(4, 'ending-soon-cards');

  setTimeout(() => {
    renderQuickCards(endingSoon, 'ending-soon-cards');
  }, 500);
}

/**
 * Render Catalog Section with filters
 */
function renderCatalogSection(): void {
  applyCatalogFilters();
}

/**
 * Apply catalog filters
 */
function applyCatalogFilters(): void {
  let filtered = [...allListings];

  // Filter by category
  if (catalogState.category !== 'all') {
    filtered = filtered.filter(listing =>
      listing.tags?.some(tag => tag.toLowerCase() === catalogState.category.toLowerCase())
    );
  }

  // Filter by search
  if (catalogState.search) {
    const searchLower = catalogState.search.toLowerCase();
    filtered = filtered.filter(
      (listing) =>
        listing.title.toLowerCase().includes(searchLower) ||
        listing.description?.toLowerCase().includes(searchLower)
    );
  }

  // Filter by active only
  if (catalogState.activeOnly) {
    const now = new Date();
    filtered = filtered.filter(listing => new Date(listing.endsAt) > now);
  }

  // Sort listings
  filtered.sort((a, b) => {
    const aValue = a[catalogState.sort as keyof Listing] as string;
    const bValue = b[catalogState.sort as keyof Listing] as string;

    if (catalogState.sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Paginate results
  const startIndex = (catalogState.page - 1) * catalogState.itemsPerPage;
  const endIndex = startIndex + catalogState.itemsPerPage;
  const paginatedListings = filtered.slice(startIndex, endIndex);

  // Render paginated cards
  renderCollectionCards(paginatedListings, 'catalog-cards');

  // Render pagination
  const totalPages = Math.ceil(filtered.length / catalogState.itemsPerPage);
  renderPagination({
    containerId: 'catalog-pagination',
    currentPage: catalogState.page,
    totalPages,
    onPageChange: (page: number) => {
      catalogState.page = page;
      applyCatalogFilters();

      // Scroll to catalog section
      const catalogSection = document.getElementById('catalog-cards');
      if (catalogSection) {
        catalogSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
  });
}


// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHomePage);
} else {
  initHomePage();
}
