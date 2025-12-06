import { getListings } from '../api/listings';
import { renderHeader } from '../components/navbar';
import { renderFooter } from '../components/Footer';
import { renderProductCards, showProductCardSkeletons } from '../components/ProductCard';
import { renderQuickCards, showQuickCardSkeletons } from '../components/QuickCard';
import { renderCollectionCards } from '../components/CollectionCard';
import { toast } from '../components/Toast';
import { isLoggedIn } from '../utils/auth';
import { formatTimeRemaining } from '../utils/formatDate';
import type { Listing } from '../types/api';

// State management for catalog section
interface CatalogState {
  category: string;
  sort: string;
  sortOrder: 'asc' | 'desc';
  activeOnly: boolean;
  page: number;
  limit: number;
}

let allListings: Listing[] = [];
let catalogState: CatalogState = {
  category: 'all',
  sort: 'endsAt',
  sortOrder: 'asc',
  activeOnly: false,
  page: 1,
  limit: 12,
};

/**
 * Initialize home page
 */
async function initHomePage(): Promise<void> {
  // Render header and footer (header includes guest banner)
  renderHeader();
  renderFooter();

  // Show login required message for create listing button if not logged in
  setupCreateListingButton();

  // Load all data
  await loadAllData();

  // Initialize catalog section filters
  initializeCatalogFilters();
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
    console.log('Fetching listings...');

    // Fetch all listings
    const response = await getListings({
      limit: 100,
      _seller: true,
      _bids: true,
      sort: 'created',
      sortOrder: 'desc',
    });

    console.log('API Response:', response);

    if (response.data && response.data.length > 0) {
      allListings = response.data;
      console.log(`Loaded ${allListings.length} listings`);

      // Render all sections
      renderHeroSection();
      renderTrendingSection();
      renderNewListingsSection();
      renderEndingSoonSection();
      renderCatalogSection();
    } else {
      console.warn('No listings found in API response');
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
          <div class="h-28 bg-slate-200" style="border-bottom: 3px solid #1e293b">
            <a href="/listing.html?id=${listing.id}" class="block h-full">
              <img
                src="${image}"
                alt="${listing.title}"
                class="h-full w-full object-cover"
              />
            </a>
          </div>
          <div class="p-3">
            <h4 class="mb-1 text-sm font-bold text-slate-900">
              <a href="/listing.html?id=${listing.id}" class="hover:underline">
                ${listing.title.length > 25 ? listing.title.substring(0, 25) + '...' : listing.title}
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
 * Render Catalog Section with filters and pagination
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

  // Paginate
  const start = (catalogState.page - 1) * catalogState.limit;
  const end = start + catalogState.limit;
  const paginated = filtered.slice(start, end);

  // Render cards
  renderCollectionCards(paginated, 'catalog-cards');

  // Update counts
  updateCatalogCounts(filtered.length, start, end);

  // Render pagination
  renderCatalogPagination(filtered.length);
}

/**
 * Update catalog counts
 */
function updateCatalogCounts(total: number, start: number, end: number): void {
  const catalogTotal = document.getElementById('catalog-total');
  const catalogShowingStart = document.getElementById('catalog-showing-start');
  const catalogShowingEnd = document.getElementById('catalog-showing-end');

  if (catalogTotal) catalogTotal.textContent = total.toLocaleString();
  if (catalogShowingStart) catalogShowingStart.textContent = total > 0 ? (start + 1).toString() : '0';
  if (catalogShowingEnd) catalogShowingEnd.textContent = Math.min(end, total).toString();
}

/**
 * Render catalog pagination
 */
function renderCatalogPagination(total: number): void {
  const paginationContainer = document.getElementById('catalog-pagination');
  if (!paginationContainer) return;

  const totalPages = Math.ceil(total / catalogState.limit);

  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }

  const currentPage = catalogState.page;

  let html = `
    <div class="text-sm text-slate-600">
      Page <span class="font-bold text-slate-900">${currentPage}</span> of
      <span class="font-bold text-slate-900">${totalPages}</span>
    </div>
    <div class="flex items-center gap-2">
  `;

  // Previous button
  html += `
    <button
      class="inline-flex items-center gap-2 px-6 py-3 text-xs font-bold tracking-wide ${currentPage === 1 ? 'cursor-not-allowed bg-slate-200 text-slate-400' : 'bg-white text-slate-900 hover:bg-slate-50'}"
      style="border: 2px solid ${currentPage === 1 ? '#cbd5e1' : '#334155'}"
      ${currentPage === 1 ? 'disabled' : ''}
      data-catalog-page="${currentPage - 1}"
    >
      <i class="text-xs fa-solid fa-chevron-left"></i>
      PREVIOUS
    </button>
  `;

  // Page numbers
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  if (startPage > 1) {
    html += `
      <button class="px-6 py-3 text-xs font-bold tracking-wide bg-white text-slate-700 hover:bg-slate-50" style="border: 2px solid #334155" data-catalog-page="1">1</button>
    `;
    if (startPage > 2) {
      html += `<span class="px-3 text-slate-500">...</span>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `
      <button class="px-6 py-3 text-xs font-bold tracking-wide ${i === currentPage ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}" style="border: 2px solid ${i === currentPage ? '#1e293b' : '#334155'}" data-catalog-page="${i}">${i}</button>
    `;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<span class="px-3 text-slate-500">...</span>`;
    }
    html += `
      <button class="px-6 py-3 text-xs font-bold tracking-wide bg-white text-slate-700 hover:bg-slate-50" style="border: 2px solid #334155" data-catalog-page="${totalPages}">${totalPages}</button>
    `;
  }

  // Next button
  html += `
    <button
      class="inline-flex items-center gap-2 px-6 py-3 text-xs font-bold tracking-wide ${currentPage === totalPages ? 'cursor-not-allowed bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-slate-800'}"
      style="border: 2px solid ${currentPage === totalPages ? '#cbd5e1' : '#1e293b'}"
      ${currentPage === totalPages ? 'disabled' : ''}
      data-catalog-page="${currentPage + 1}"
    >
      NEXT
      <i class="text-xs fa-solid fa-chevron-right"></i>
    </button>
  `;

  html += `</div>`;

  paginationContainer.innerHTML = html;

  // Add event listeners
  const pageButtons = paginationContainer.querySelectorAll<HTMLButtonElement>('button[data-catalog-page]');
  pageButtons.forEach(button => {
    button.addEventListener('click', () => {
      const page = parseInt(button.getAttribute('data-catalog-page') || '1', 10);
      if (page >= 1 && page <= totalPages) {
        catalogState.page = page;
        applyCatalogFilters();

        // Scroll to catalog section
        const catalogSection = document.getElementById('catalog-cards');
        if (catalogSection) {
          catalogSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
}

/**
 * Initialize catalog filters
 */
function initializeCatalogFilters(): void {
  // Category buttons
  const categoryButtons = document.querySelectorAll<HTMLButtonElement>('[data-catalog-category]');
  categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Update active state
      categoryButtons.forEach(btn => {
        btn.classList.remove('bg-slate-900', 'text-white');
        btn.classList.add('bg-white', 'text-slate-700');
        btn.setAttribute('style', 'border: 2px solid #334155');
        const icon = btn.querySelector('i');
        if (icon) icon.className = icon.className.replace('fa-circle-check', 'fa-circle');
      });

      button.classList.remove('bg-white', 'text-slate-700');
      button.classList.add('bg-slate-900', 'text-white');
      button.setAttribute('style', 'border: 2px solid #1e293b');
      const icon = button.querySelector('i');
      if (icon && !icon.classList.contains('fa-circle-check')) {
        icon.classList.add('fa-circle-check');
      }

      catalogState.category = button.getAttribute('data-catalog-category') || 'all';
      catalogState.page = 1;
      applyCatalogFilters();
    });
  });

  // Active only checkbox
  const activeOnlyCheckbox = document.getElementById('catalog-active-only') as HTMLInputElement;
  if (activeOnlyCheckbox) {
    activeOnlyCheckbox.addEventListener('change', () => {
      catalogState.activeOnly = activeOnlyCheckbox.checked;
      catalogState.page = 1;
      applyCatalogFilters();
    });
  }

  // Sort select
  const sortSelect = document.getElementById('catalog-sort') as HTMLSelectElement;
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      const value = sortSelect.value;
      const [sort, order] = value.split('-');
      catalogState.sort = sort;
      catalogState.sortOrder = order as 'asc' | 'desc';
      catalogState.page = 1;
      applyCatalogFilters();
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHomePage);
} else {
  initHomePage();
}
