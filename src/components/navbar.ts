import { isLoggedIn, getCurrentUser } from '../utils/auth';
import { logout } from '../api/auth';

/**
 * Render the header/navigation component
 */
export function renderHeader(): void {
  const header = document.getElementById('header');
  if (!header) return;

  const isUserLoggedIn = isLoggedIn();
  const user = getCurrentUser();

  header.innerHTML = `
    ${
      !isUserLoggedIn
        ? `
    <!-- Guest Banner -->
    <div style="background-color: #f7f7f5; border-bottom: 2px solid #dc2629">
      <div class="mx-auto max-w-7xl px-6 md:px-8 py-3">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 w-5 h-5 bg-red-600"></div>
          <div>
            <div class="text-sm font-bold text-slate-900 uppercase tracking-wide mb-1">
              Browsing as Guest
            </div>
            <div class="text-sm text-slate-600">
              You can explore auctions, but you need an account to place bids and create listings.
            </div>
          </div>
        </div>
      </div>
    </div>
    `
        : ''
    }
    
    <!-- Main Navigation -->
    <nav style="background-color: #f7f7f5">
      <div class="mx-auto max-w-7xl px-6 md:px-8 pt-5">
        <!-- Top row: brand + search + nav + credits -->
        <div class="flex items-center gap-3 pb-4" style="border-bottom: 1px solid #e2e8f0">
          
          <!-- Brand Logo - Compact -->
          <a href="/index.html" class="inline-flex items-center gap-1.5 text-slate-900 hover:text-slate-700 transition-colors whitespace-nowrap flex-shrink-0">
            <svg class="h-6 w-6" width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Aucto icon">
              <path d="M24 108 L64 20 L104 108 Z" fill="none" stroke="currentColor" stroke-width="14" stroke-linejoin="round"/>
              <line x1="40" y1="72" x2="88" y2="72" stroke="currentColor" stroke-width="14" stroke-linecap="round"/>
            </svg>
            <span class="hidden sm:inline font-bold text-sm">Aucto</span>
          </a>

          <!-- Inline search (grows to fill available space) -->
          <section aria-label="Global auction search" class="hidden md:flex flex-1 items-center gap-2">
            <form class="flex-1" role="search" aria-label="Search auctions" id="header-search-form">
              <label for="global-search-input" class="sr-only">Search auctions</label>
              <div class="relative">
                <input
                  id="global-search-input"
                  name="q"
                  type="search"
                  placeholder="Search by title, description, or lot number..."
                  class="w-full bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  style="border: 2px solid #334155"
                />
                <i class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 fa-solid fa-magnifying-glass text-sm text-slate-400"></i>
              </div>
            </form>

            <!-- Filters pill -->
            <button
              id="toggle-advanced-filters"
              type="button"
              class="flex items-center gap-2 bg-white px-3 py-2 hover:bg-slate-50"
              style="border: 2px solid #334155"
              aria-expanded="false"
              aria-controls="advanced-filters-bar"
            >
              <i class="fa-solid fa-sliders text-sm"></i>
              <i class="fa-solid fa-chevron-down text-xs transition-transform" id="filters-chevron"></i>
            </button>
          </section>

          <!-- Primary nav -->
          <div class="hidden items-center gap-6 text-sm font-bold text-slate-700 lg:flex">
            <a href="/index.html" class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5">
              <i class="fa-solid fa-house text-sm"></i>
              <span>Feed</span>
            </a>
            <a href="/index.html" class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5">
              <i class="fa-solid fa-layer-group text-sm"></i>
              <span>Catalog</span>
            </a>
            ${
              isUserLoggedIn
                ? `
            <a href="/profile.html" class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5">
              <i class="fa-solid fa-gavel text-sm"></i>
              <span>My Bids</span>
            </a>
            <a href="/profile.html" class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5">
              <i class="fa-solid fa-user text-sm"></i>
              <span>Profile</span>
            </a>
            `
                : `
            <a href="/login.html" class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5">
              <i class="fa-solid fa-gavel text-sm"></i>
              <span>My Bids</span>
            </a>
            <a href="/login.html" class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5">
              <i class="fa-solid fa-user text-sm"></i>
              <span>Profile</span>
            </a>
            `
            }
          </div>

          <!-- Credits + profile OR Auth buttons -->
          <div class="flex items-center gap-3">
            ${
              isUserLoggedIn && user
                ? `
              <!-- Logged In User -->
              <!-- Credits Box -->
              <div class="hidden items-center gap-2 bg-slate-50 px-4 py-2 sm:flex" style="border: 2px solid #1e293b">
                <span class="text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500">Credits</span>
                <span class="text-base font-bold text-slate-900">${new Intl.NumberFormat('en-US').format(user.credits || 0)}</span>
              </div>
              
              <!-- Profile Button -->
              <button 
                id="profile-menu-btn"
                class="flex items-center gap-2 bg-white px-4 py-2 hover:bg-slate-50"
                style="border: 2px solid #1e293b"
                aria-expanded="false"
                aria-haspopup="true"
              >
                ${
                  user.avatar?.url
                    ? `<img src="${user.avatar.url}" alt="${user.name}" class="h-8 w-8 object-cover" style="border: 2px solid #1e293b" />`
                    : `<div class="h-8 w-8 bg-slate-900 text-white flex items-center justify-center font-bold text-sm" style="border: 2px solid #1e293b">${user.name.charAt(0).toUpperCase()}</div>`
                }
                <span class="hidden text-sm font-bold text-slate-900 md:block">${user.name}</span>
              </button>

              <!-- Profile Dropdown Menu -->
              <div 
                id="profile-dropdown-menu"
                class="hidden absolute right-6 mt-2 w-48 bg-white shadow-lg z-50"
                style="border: 2px solid #1e293b; top: 60px;"
                role="menu"
              >
                <a href="/profile.html" class="block px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50" role="menuitem">
                  <i class="fa-solid fa-user w-5"></i> My Profile
                </a>
                <a href="/create-listing.html" class="block px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50 border-t" style="border-color: #e2e8f0" role="menuitem">
                  <i class="fa-solid fa-plus w-5"></i> Create Listing
                </a>
                <button 
                  id="logout-btn"
                  class="w-full text-left px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50 border-t"
                  style="border-color: #e2e8f0"
                  role="menuitem"
                >
                  <i class="fa-solid fa-sign-out-alt w-5"></i> Logout
                </button>
              </div>
            `
                : `
              <!-- Guest Navigation -->
              <a 
                href="/login.html" 
                class="hidden bg-white px-4 py-2 text-sm font-bold tracking-wide text-slate-900 hover:bg-slate-50 md:inline-flex items-center gap-2"
                style="border: 2px solid #1e293b"
              >
                <i class="fa-solid fa-right-to-bracket text-sm"></i>
                Log in
              </a>
              <a 
                href="/register.html" 
                class="bg-slate-900 px-4 py-2 text-sm font-bold tracking-wide text-white hover:bg-slate-800 inline-flex items-center gap-2"
                style="border: 2px solid #1e293b"
              >
                <i class="fa-solid fa-user-plus text-sm"></i>
                Create account
              </a>
            `
            }
          </div>
        </div>

        <!-- Advanced filter bar (hidden by default) -->
        <div
          id="advanced-filters-bar"
          class="hidden px-4 py-4 md:px-6 md:py-4"
          style="background-color: #f7f7f5; border-bottom: 3px solid #1e293b"
        >
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <!-- Tag filters -->
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                data-filter="all"
                class="bg-slate-900 px-4 py-2 text-[11px] font-bold tracking-[0.18em] uppercase text-white inline-flex items-center gap-2"
                style="border: 2px solid #1e293b"
                aria-pressed="true"
              >
                <i class="fa-solid fa-check text-xs"></i>
                All Items
              </button>
              <button
                type="button"
                data-filter="tech"
                class="bg-white px-4 py-2 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
                style="border: 2px solid #334155"
                aria-pressed="false"
              >
                <i class="fa-solid fa-microchip text-xs"></i>
                Tech
              </button>
              <button
                type="button"
                data-filter="fashion"
                class="bg-white px-4 py-2 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
                style="border: 2px solid #334155"
                aria-pressed="false"
              >
                <i class="fa-solid fa-shirt text-xs"></i>
                Fashion
              </button>
              <button
                type="button"
                data-filter="home"
                class="bg-white px-4 py-2 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
                style="border: 2px solid #334155"
                aria-pressed="false"
              >
                <i class="fa-solid fa-house text-xs"></i>
                Home
              </button>
              <button
                type="button"
                data-filter="art"
                class="bg-white px-4 py-2 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
                style="border: 2px solid #334155"
                aria-pressed="false"
              >
                <i class="fa-solid fa-palette text-xs"></i>
                Art
              </button>
            </div>

            <!-- Filters + Sort -->
            <div class="flex flex-wrap items-center gap-3 text-sm">
              <!-- Active only checkbox -->
              <label class="inline-flex items-center gap-2 text-slate-700 cursor-pointer">
                <input type="checkbox" id="active-only-filter" class="h-4 w-4 cursor-pointer" style="accent-color: #1e293b" />
                <span>Active only</span>
              </label>

              <!-- Sort dropdown -->
              <div class="relative">
                <select
                  id="sort-filter-select"
                  class="bg-white px-4 py-2 pr-8 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-700 hover:bg-slate-50 focus:outline-none appearance-none"
                  style="border: 2px solid #334155"
                >
                  <option value="created-desc">Newest first</option>
                  <option value="created-asc">Oldest first</option>
                  <option value="endsAt-asc">Ending soon</option>
                  <option value="title-asc">Title (A-Z)</option>
                  <option value="title-desc">Title (Z-A)</option>
                </select>
                <div class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <div class="h-0 w-0" style="border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 6px solid #64748b;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  `;

  // Initialize event listeners
  initHeaderEvents();
}

/**
 * Initialize header event listeners
 */
function initHeaderEvents(): void {
  // Profile menu toggle
  const profileMenuBtn = document.getElementById('profile-menu-btn');
  const profileDropdownMenu = document.getElementById('profile-dropdown-menu');

  if (profileMenuBtn && profileDropdownMenu) {
    profileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !profileDropdownMenu.classList.contains('hidden');
      profileDropdownMenu.classList.toggle('hidden');
      profileMenuBtn.setAttribute('aria-expanded', String(!isOpen));
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      if (!profileDropdownMenu.classList.contains('hidden')) {
        profileDropdownMenu.classList.add('hidden');
        profileMenuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logout();
    });
  }

  // Advanced filters toggle
  const toggleFiltersBtn = document.getElementById('toggle-advanced-filters');
  const filtersBar = document.getElementById('advanced-filters-bar');
  const filtersChevron = document.getElementById('filters-chevron');

  if (toggleFiltersBtn && filtersBar) {
    toggleFiltersBtn.addEventListener('click', () => {
      const isOpen = !filtersBar.classList.contains('hidden');
      filtersBar.classList.toggle('hidden');
      toggleFiltersBtn.setAttribute('aria-expanded', String(!isOpen));
      
      if (filtersChevron) {
        filtersChevron.classList.toggle('rotate-180');
      }
    });
  }

  // Filter buttons (tag filtering)
  const filterButtons = document.querySelectorAll('[data-filter]');
  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      // Update active state
      filterButtons.forEach((b) => {
        b.classList.remove('bg-slate-900', 'text-white');
        b.classList.add('bg-white', 'text-slate-700');
        b.setAttribute('aria-pressed', 'false');
        // Remove check icon
        const icon = b.querySelector('i');
        if (icon) {
          icon.className = icon.className.replace('fa-check', '').trim();
        }
      });

      btn.classList.remove('bg-white', 'text-slate-700');
      btn.classList.add('bg-slate-900', 'text-white');
      btn.setAttribute('aria-pressed', 'true');
      
      // Add check icon
      const icon = btn.querySelector('i');
      if (icon && !icon.classList.contains('fa-check')) {
        icon.classList.add('fa-check');
      }

      // Dispatch custom event for filtering
      const filterValue = btn.getAttribute('data-filter');
      document.dispatchEvent(new CustomEvent('filterChange', { detail: { filter: filterValue } }));
    });
  });

  // Search form submission
  const headerSearchForm = document.getElementById('header-search-form');
  if (headerSearchForm) {
    headerSearchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = headerSearchForm.querySelector('input[name="q"]') as HTMLInputElement;
      const searchTerm = input.value.trim();

      if (searchTerm) {
        window.location.href = `/index.html?q=${encodeURIComponent(searchTerm)}`;
      }
    });
  }

  // Active only checkbox
  const activeOnlyCheckbox = document.getElementById('active-only-filter') as HTMLInputElement;
  if (activeOnlyCheckbox) {
    activeOnlyCheckbox.addEventListener('change', () => {
      document.dispatchEvent(new CustomEvent('activeOnlyChange', { 
        detail: { activeOnly: activeOnlyCheckbox.checked } 
      }));
    });
  }

  // Sort filter
  const sortFilterSelect = document.getElementById('sort-filter-select') as HTMLSelectElement;
  if (sortFilterSelect) {
    sortFilterSelect.addEventListener('change', () => {
      const value = sortFilterSelect.value;
      const [sort, order] = value.split('-');
      document.dispatchEvent(new CustomEvent('sortChange', { 
        detail: { sort, order } 
      }));
    });
  }
}