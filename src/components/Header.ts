import { isLoggedIn, getCurrentUser } from '../utils/auth';
import { logout } from '../api/auth';
import { formatCurrency } from '../utils/formatCurrency';

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
    <div class="bg-aucto-bg border-b-2 border-red-600">
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
    <nav class="bg-aucto-bg">
      <div class="mx-auto max-w-7xl px-6 md:px-8 pt-5">
        <!-- Top row -->
        <div class="flex items-center gap-3 pb-4 border-b border-aucto-borderLight">
          
          <!-- Brand Logo -->
          <a href="/index.html" class="inline-flex items-center gap-1.5 text-slate-900 hover:text-slate-700 transition-colors whitespace-nowrap flex-shrink-0">
            <svg class="h-6 w-6" width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Aucto icon">
              <path d="M24 108 L64 20 L104 108 Z" fill="none" stroke="currentColor" stroke-width="14" stroke-linejoin="round"/>
              <line x1="40" y1="72" x2="88" y2="72" stroke="currentColor" stroke-width="14" stroke-linecap="round"/>
            </svg>
            <span class="hidden sm:inline font-bold text-sm">Aucto</span>
          </a>

          <!-- Search Bar (Desktop) -->
          <div class="hidden md:flex flex-1 items-center gap-2">
            <form class="flex-1" role="search" aria-label="Search auctions" id="header-search-form">
              <label for="header-search-input" class="sr-only">Search auctions</label>
              <div class="relative">
                <input
                  id="header-search-input"
                  name="q"
                  type="search"
                  placeholder="Search by title, description..."
                  class="w-full bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none border-2 border-aucto-borderMid"
                />
                <i class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 fa-solid fa-magnifying-glass text-sm text-slate-400"></i>
              </div>
            </form>
          </div>

          <!-- Right Side Navigation -->
          <div class="flex items-center gap-3">
            ${
              isUserLoggedIn && user
                ? `
              <!-- Logged In User -->
              <div class="hidden md:flex items-center gap-2 text-sm">
                <i class="fa-solid fa-coins text-yellow-600"></i>
                <span class="font-bold">${formatCurrency(user.credits || 0, true)}</span>
              </div>
              
              <!-- Create Listing Button -->
              <a href="/create-listing.html" class="hidden md:inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 hover:bg-slate-800 transition-colors">
                <i class="fa-solid fa-plus text-xs"></i>
                <span class="font-medium text-sm">Create Listing</span>
              </a>

              <!-- Profile Dropdown -->
              <div class="relative" id="profile-dropdown">
                <button 
                  id="profile-dropdown-btn"
                  type="button" 
                  class="flex items-center gap-2 text-sm hover:opacity-70 transition-opacity"
                  aria-expanded="false"
                  aria-haspopup="true"
                >
                  ${
                    user.avatar?.url
                      ? `<img src="${user.avatar.url}" alt="${user.name}" class="w-8 h-8 rounded-full object-cover" />`
                      : `<div class="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">${user.name.charAt(0).toUpperCase()}</div>`
                  }
                  <span class="hidden lg:inline font-medium">${user.name}</span>
                  <i class="fa-solid fa-chevron-down text-xs"></i>
                </button>

                <!-- Dropdown Menu -->
                <div 
                  id="profile-dropdown-menu"
                  class="hidden absolute right-0 mt-2 w-48 bg-white border-2 border-slate-900 shadow-lg z-50"
                  role="menu"
                >
                  <a href="/profile.html" class="block px-4 py-2 text-sm hover:bg-slate-50" role="menuitem">
                    <i class="fa-solid fa-user w-4"></i> My Profile
                  </a>
                  <button 
                    id="logout-btn"
                    class="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-t border-slate-200" 
                    role="menuitem"
                  >
                    <i class="fa-solid fa-sign-out-alt w-4"></i> Logout
                  </button>
                </div>
              </div>
            `
                : `
              <!-- Guest Navigation -->
              <a href="/login.html" class="text-sm font-medium text-slate-900 hover:text-slate-700 transition-colors">
                Log in
              </a>
              <a href="/register.html" class="bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800 transition-colors">
                Register
              </a>
            `
            }

            <!-- Mobile Menu Button -->
            <button 
              id="mobile-menu-btn"
              type="button" 
              class="md:hidden text-slate-900"
              aria-expanded="false"
              aria-controls="mobile-menu"
            >
              <i class="fa-solid fa-bars text-xl"></i>
            </button>
          </div>
        </div>

        <!-- Mobile Search (Hidden by default) -->
        <div class="md:hidden pt-3 pb-2" id="mobile-search">
          <form role="search" aria-label="Search auctions" id="mobile-search-form">
            <label for="mobile-search-input" class="sr-only">Search auctions</label>
            <div class="relative">
              <input
                id="mobile-search-input"
                name="q"
                type="search"
                placeholder="Search auctions..."
                class="w-full bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none border-2 border-aucto-borderMid"
              />
              <i class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 fa-solid fa-magnifying-glass text-sm text-slate-400"></i>
            </div>
          </form>
        </div>
      </div>
    </nav>

    <!-- Mobile Menu (Hidden by default) -->
    <div id="mobile-menu" class="hidden md:hidden bg-white border-b-2 border-slate-900">
      <div class="mx-auto max-w-7xl px-6 py-4 space-y-2">
        ${
          isUserLoggedIn && user
            ? `
          <div class="flex items-center gap-2 pb-2 border-b border-slate-200">
            <i class="fa-solid fa-coins text-yellow-600"></i>
            <span class="font-bold text-sm">${formatCurrency(user.credits || 0, true)}</span>
          </div>
          <a href="/create-listing.html" class="block py-2 text-sm font-medium">
            <i class="fa-solid fa-plus w-4"></i> Create Listing
          </a>
          <a href="/profile.html" class="block py-2 text-sm font-medium">
            <i class="fa-solid fa-user w-4"></i> My Profile
          </a>
          <button id="mobile-logout-btn" class="w-full text-left py-2 text-sm font-medium border-t border-slate-200">
            <i class="fa-solid fa-sign-out-alt w-4"></i> Logout
          </button>
        `
            : `
          <a href="/login.html" class="block py-2 text-sm font-medium">Log in</a>
          <a href="/register.html" class="block py-2 text-sm font-medium">Register</a>
        `
        }
      </div>
    </div>
  `;

  // Initialize event listeners
  initHeaderEvents();
}

/**
 * Initialize header event listeners
 */
function initHeaderEvents(): void {
  // Profile dropdown toggle
  const dropdownBtn = document.getElementById('profile-dropdown-btn');
  const dropdownMenu = document.getElementById('profile-dropdown-menu');

  if (dropdownBtn && dropdownMenu) {
    dropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdownMenu.classList.contains('hidden');
      dropdownMenu.classList.toggle('hidden');
      dropdownBtn.setAttribute('aria-expanded', String(isOpen));
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      if (!dropdownMenu.classList.contains('hidden')) {
        dropdownMenu.classList.add('hidden');
        dropdownBtn.setAttribute('aria-expanded', 'false');
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

  // Mobile logout button
  const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
  if (mobileLogoutBtn) {
    mobileLogoutBtn.addEventListener('click', () => {
      logout();
    });
  }

  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.contains('hidden');
      mobileMenu.classList.toggle('hidden');
      mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // Search form submission (both desktop and mobile)
  const headerSearchForm = document.getElementById('header-search-form');
  const mobileSearchForm = document.getElementById('mobile-search-form');

  const handleSearch = (e: Event) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.querySelector('input[name="q"]') as HTMLInputElement;
    const searchTerm = input.value.trim();

    if (searchTerm) {
      window.location.href = `/index.html?q=${encodeURIComponent(searchTerm)}`;
    }
  };

  if (headerSearchForm) {
    headerSearchForm.addEventListener('submit', handleSearch);
  }

  if (mobileSearchForm) {
    mobileSearchForm.addEventListener('submit', handleSearch);
  }
}