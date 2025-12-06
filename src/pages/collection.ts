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
  status: string;
  search: string;
  page: number;
  limit: number;
}

let currentFilters: FilterState = {
  category: 'all',
  sort: 'created',
  sortOrder: 'desc',
  status: '_active=true',
  search: '',
  page: 1,
  limit: 24,
};

let allListings: Listing[] = [];
let filteredListings: Listing[] = [];

/**
 * Initialize scroll-triggered filter bar
 */
function initializeScrollTrigger(): void {
  const filterBar = document.getElementById('filter-bar');
  if (!filterBar) return;

  // Hide filter bar initially
  filterBar.style.maxHeight = '0';
  filterBar.style.overflow = 'hidden';
  filterBar.style.padding = '0';
  filterBar.style.marginBottom = '0';
  filterBar.style.opacity = '0';

  let isFilterBarOpen = false;
  const scrollThreshold = 200; // Pixels to scroll before showing filter bar

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY || window.pageYOffset;

    if (scrollY > scrollThreshold && !isFilterBarOpen) {
      // Open filter bar
      filterBar.style.maxHeight = '2000px';
      filterBar.style.padding = window.innerWidth < 768 ? '24px' : '32px';
      filterBar.style.overflow = 'visible';
      filterBar.style.marginBottom = '24px';
      filterBar.style.opacity = '1';
      isFilterBarOpen = true;
    } else if (scrollY <= scrollThreshold && isFilterBarOpen) {
      // Close filter bar
      filterBar.style.maxHeight = '0';
      filterBar.style.padding = '0';
      filterBar.style.overflow = 'hidden';
      filterBar.style.marginBottom = '0';
      filterBar.style.opacity = '0';
      isFilterBarOpen = false;
    }
  });
}

/**
 * Initialize filter event listeners
 */
function initializeFilters(): void {
  // Mobile filter toggle
  const mobileFilterToggle = document.getElementById('mobile-filter-toggle');
  const filterBar = document.getElementById('filter-bar');
  const filterToggleIcon = document.getElementById('filter-toggle-icon');

  if (mobileFilterToggle && filterBar && filterToggleIcon) {
    mobileFilterToggle.addEventListener('click', () => {
      const isHidden = filterBar.style.maxHeight === '0px' || filterBar.style.maxHeight === '';

      if (isHidden) {
        filterBar.style.maxHeight = '2000px';
        filterBar.style.padding = window.innerWidth < 768 ? '24px' : '32px';
        filterBar.style.overflow = 'visible';
        filterBar.style.marginBottom = '24px';
        filterBar.style.opacity = '1';
        filterToggleIcon.classList.add('fa-rotate-180');
      } else {
        filterBar.style.maxHeight = '0';
        filterBar.style.padding = '0';
        filterBar.style.overflow = 'hidden';
        filterBar.style.marginBottom = '0';
        filterBar.style.opacity = '0';
        filterToggleIcon.classList.remove('fa-rotate-180');
      }
    });
  }

  // Category buttons
  const categoryButtons = document.querySelectorAll<HTMLButtonElement>('[data-category]');
  categoryButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      // Remove active state from all
      categoryButtons.forEach((b) => {
        b.classList.remove('bg-slate-900', 'text-white');
        b.classList.add('bg-white', 'text-slate-700');
        b.setAttribute('style', 'border: 2px solid #334155');
        // Remove check icon
        const icon = b.querySelector('i');
        if (icon) {
          icon.classList.remove('fa-check');
        }
      });

      // Add active state to clicked
      btn.classList.remove('bg-white', 'text-slate-700');
      btn.classList.add('bg-slate-900', 'text-white');
      btn.setAttribute('style', 'border: 2px solid #1e293b');

      // Add check icon
      const icon = btn.querySelector('i');
      if (icon && !icon.classList.contains('fa-check')) {
        icon.classList.add('fa-check');
      }

      currentFilters.category = btn.getAttribute('data-category') || 'all';
      currentFilters.page = 1; // Reset to first page
      applyFilters();
    });
  });

  // Sort select
  const sortSelect = document.getElementById('sort-select') as HTMLSelectElement;
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      const value = sortSelect.value;
      const [sort, order] = value.split('-');
      currentFilters.sort = sort;
      currentFilters.sortOrder = order as 'asc' | 'desc';
      currentFilters.page = 1;
      applyFilters();
    });
  }

  // Status select
  const statusSelect = document.getElementById('status-select') as HTMLSelectElement;
  if (statusSelect) {
    statusSelect.addEventListener('change', () => {
      currentFilters.status = statusSelect.value;
      currentFilters.page = 1;
      applyFilters();
    });
  }

  // Search input
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  if (searchInput) {
    let searchTimeout: ReturnType<typeof setTimeout>;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentFilters.search = searchInput.value.trim();
        currentFilters.page = 1;
        applyFilters();
      }, 500); // Debounce search
    });
  }

  // Apply filters button
  const applyButton = document.getElementById('apply-filters');
  if (applyButton) {
    applyButton.addEventListener('click', () => {
      applyFilters();
    });
  }

  // Clear filters button
  const clearButton = document.getElementById('clear-filters');
  if (clearButton) {
    clearButton.addEventListener('click', () => {
      clearFilters();
    });
  }

  // View toggle
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
}

/**
 * Initialize collection page
 */
export async function initCollectionPage(): Promise<void> {
  // Render header and footer
  await renderHeader();
  renderFooter();

  // Initialize filters
  initializeFilters();

  // Initialize scroll-triggered filter bar
  initializeScrollTrigger();

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

  // Filter by status
  if (currentFilters.status === 'ending-today') {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    filtered = filtered.filter((listing) => {
      const endsAt = new Date(listing.endsAt);
      return endsAt >= today && endsAt <= tomorrow;
    });
  } else if (currentFilters.status === 'ending-week') {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    filtered = filtered.filter((listing) => {
      const endsAt = new Date(listing.endsAt);
      return endsAt >= today && endsAt <= nextWeek;
    });
  } else if (currentFilters.status === 'new') {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    filtered = filtered.filter((listing) => {
      const created = new Date(listing.created);
      return created >= threeDaysAgo;
    });
  }

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
 * Clear all filters
 */
function clearFilters(): void {
  currentFilters = {
    category: 'all',
    sort: 'created',
    sortOrder: 'desc',
    status: '_active=true',
    search: '',
    page: 1,
    limit: 24,
  };

  // Reset UI
  const categoryButtons = document.querySelectorAll<HTMLButtonElement>('[data-category]');
  categoryButtons.forEach((btn, index) => {
    if (index === 0) {
      btn.classList.remove('bg-white', 'text-slate-700');
      btn.classList.add('bg-slate-900', 'text-white');
      btn.setAttribute('style', 'border: 2px solid #1e293b');
      const icon = btn.querySelector('i');
      if (icon && !icon.classList.contains('fa-check')) {
        icon.classList.add('fa-check');
      }
    } else {
      btn.classList.remove('bg-slate-900', 'text-white');
      btn.classList.add('bg-white', 'text-slate-700');
      btn.setAttribute('style', 'border: 2px solid #334155');
      const icon = btn.querySelector('i');
      if (icon) {
        icon.classList.remove('fa-check');
      }
    }
  });

  const sortSelect = document.getElementById('sort-select') as HTMLSelectElement;
  if (sortSelect) sortSelect.value = 'created-desc';

  const statusSelect = document.getElementById('status-select') as HTMLSelectElement;
  if (statusSelect) statusSelect.value = '_active=true';

  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  if (searchInput) searchInput.value = '';

  applyFilters();
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
