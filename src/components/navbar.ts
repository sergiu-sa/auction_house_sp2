import { isLoggedIn, getCurrentUser } from '../utils/auth';
import { logout } from '../api/auth';
import { renderGuestBanner } from './guestBanner';
import { getProfile } from '../api/profile';
import { setUser } from '../utils/storage';

/**
 * Render the header/navigation component
 * Fetches fresh user data to ensure credits are up to date
 * Renders different navbar variants based on data-page-type attribute
 */
export async function renderHeader(): Promise<void> {
  const header = document.getElementById('header');
  if (!header) return;

  // Detect page type from body attribute
  const pageType = document.body.getAttribute('data-page-type') || 'browse';

  const isUserLoggedIn = isLoggedIn();
  let user = getCurrentUser();

  // Fetch fresh user data if logged in to get updated credits
  if (isUserLoggedIn && user) {
    try {
      const profileResponse = await getProfile(user.name);
      if (profileResponse.data) {
        // Update stored user data with fresh profile data
        const updatedUser = {
          name: profileResponse.data.name,
          email: profileResponse.data.email,
          bio: profileResponse.data.bio,
          avatar: profileResponse.data.avatar,
          banner: profileResponse.data.banner,
          credits: profileResponse.data.credits,
          _count: profileResponse.data._count,
        };
        setUser(updatedUser);
        user = updatedUser;
      }
    } catch (error) {
      // If fetch fails, continue with cached user data
      console.error('Failed to fetch fresh user data:', error);
    }
  }

  // Render appropriate navbar variant based on page type
  let navbarHTML = '';

  if (pageType === 'auth') {
    navbarHTML = renderMinimalNavbar();
  } else if (pageType === 'user-content') {
    navbarHTML = renderSimpleNavbar(isUserLoggedIn, user);
  } else {
    // Default: browse pages (index, collection, listing)
    navbarHTML = renderFullNavbar(isUserLoggedIn, user);
  }

  header.innerHTML = `
    ${!isUserLoggedIn && pageType !== 'auth' ? renderGuestBanner() : ''}
    ${navbarHTML}
  `;

  // Initialize event listeners
  initHeaderEvents(pageType);
}

/**
 * Render minimal navbar for auth pages (login, register)
 */
function renderMinimalNavbar(): string {
  return `
    <nav style="background-color: #f7f7f5">
      <div class="mx-auto max-w-7xl px-6 md:px-8 pt-5">
        <div class="flex items-center justify-between gap-6 pb-4" style="border-bottom: 1px solid #e2e8f0">
          <!-- Brand Logo -->
          <a href="/index.html" class="inline-flex items-center text-slate-900 hover:text-slate-700 transition-colors whitespace-nowrap flex-shrink-0">
            <img src="/images/logo.svg" alt="Aucto" class="h-9" />
          </a>

          <!-- Browse as Guest link -->
          <a
            href="/index.html"
            class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-700 hover:text-slate-900 transition-colors bg-white"
            style="border: 2px solid #cbd5e1"
          >
            <span>Browse as Guest</span>
            <i class="fa-solid fa-arrow-right text-xs"></i>
          </a>
        </div>
      </div>
    </nav>
  `;
}

/**
 * Render simple navbar for user content pages (profile, create/edit listing)
 */
function renderSimpleNavbar(isUserLoggedIn: boolean, user: any): string {
  return `
    <nav style="background-color: #f7f7f5">
      <div class="mx-auto max-w-7xl px-6 md:px-8 pt-5">
        <div class="flex items-center justify-between gap-6 pb-4" style="border-bottom: 1px solid #e2e8f0">

          <!-- Brand Logo -->
          <a href="/index.html" class="inline-flex items-center text-slate-900 hover:text-slate-700 transition-colors whitespace-nowrap flex-shrink-0">
            <img src="/images/logo.svg" alt="Aucto" class="h-9" />
          </a>

          <!-- DESKTOP: Primary nav links (≥1024px) -->
          <div class="hidden lg:flex items-center gap-6 text-sm font-bold text-slate-700">
            <a href="/index.html" class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5">
              <i class="fa-solid fa-house text-sm"></i>
              <span>Feed</span>
            </a>
            <a href="/collection.html" class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5">
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

          ${renderUserSection(isUserLoggedIn, user)}
        </div>
      </div>
    </nav>

    ${renderMobileMenu(isUserLoggedIn, user)}
  `;
}

/**
 * Render full navbar for browse pages (index, collection, listing details)
 */
function renderFullNavbar(isUserLoggedIn: boolean, user: any): string {
  return `
    <nav style="background-color: #f7f7f5">
      <div class="mx-auto max-w-7xl px-6 md:px-8 pt-5">
        <!-- Top row: brand + search + nav + credits -->
        <div class="flex items-center gap-3 pb-4" style="border-bottom: 1px solid #e2e8f0">

          <!-- Brand Logo - Always visible -->
          <a href="/index.html" class="inline-flex items-center text-slate-900 hover:text-slate-700 transition-colors whitespace-nowrap flex-shrink-0">
            <img src="/images/logo.svg" alt="Aucto" class="h-9" />
          </a>

          <!-- DESKTOP: Inline search (grows to fill available space) -->
          <section aria-label="Global auction search" class="hidden lg:flex flex-1 items-center gap-2">
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

          <!-- Spacer for mobile/tablet -->
          <div class="flex-1 lg:hidden"></div>

          <!-- MOBILE/TABLET: Search icon button (< 1024px) -->
          <button
            id="mobile-search-btn"
            type="button"
            class="lg:hidden flex items-center justify-center bg-white px-3 py-2 hover:bg-slate-50"
            style="border: 2px solid #334155"
            aria-label="Toggle search"
            aria-expanded="false"
          >
            <i class="fa-solid fa-magnifying-glass text-sm"></i>
          </button>

          <!-- DESKTOP: Primary nav links (≥1024px) -->
          <div class="hidden items-center gap-6 text-sm font-bold text-slate-700 lg:flex">
            <a href="/index.html" class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5">
              <i class="fa-solid fa-house text-sm"></i>
              <span>Feed</span>
            </a>
            <a href="/collection.html" class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5">
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

          ${renderUserSection(isUserLoggedIn, user)}
        </div>

        <!-- MOBILE SEARCH BAR (expandable, hidden by default) -->
        <div
          id="mobile-search-bar"
          class="hidden lg:hidden px-2 py-4"
          style="border-bottom: 1px solid #e2e8f0"
        >
          <form role="search" aria-label="Search auctions" id="mobile-search-form">
            <label for="mobile-search-input" class="sr-only">Search auctions</label>
            <div class="relative">
              <input
                id="mobile-search-input"
                name="q"
                type="search"
                placeholder="Search auctions..."
                class="w-full bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                style="border: 2px solid #334155"
              />
              <i class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 fa-solid fa-magnifying-glass text-sm text-slate-400"></i>
            </div>
          </form>

          <!-- Filters button for mobile -->
          <button
            id="mobile-toggle-filters"
            type="button"
            class="mt-3 w-full flex items-center justify-center gap-2 bg-white px-4 py-2 hover:bg-slate-50"
            style="border: 2px solid #334155"
            aria-expanded="false"
          >
            <i class="fa-solid fa-sliders text-sm"></i>
            <span class="text-[11px] font-bold tracking-[0.18em] uppercase">Filters</span>
            <i class="fa-solid fa-chevron-down text-xs transition-transform" id="mobile-filters-chevron"></i>
          </button>
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

    ${renderMobileMenu(isUserLoggedIn, user)}
  `;
}

/**
 * Render user section (credits + profile dropdown OR auth buttons)
 */
function renderUserSection(isUserLoggedIn: boolean, user: any): string {
  return `
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

        <!-- DESKTOP: Profile Button -->
        <button
          id="profile-menu-btn"
          class="hidden lg:flex items-center gap-2 bg-white px-4 py-2 hover:bg-slate-50"
          style="border: 2px solid #1e293b"
          aria-expanded="false"
          aria-haspopup="true"
        >
          ${
            user.avatar?.url
              ? `<img src="${user.avatar.url}" alt="${user.name}" class="h-8 w-8 object-cover" style="border: 2px solid #1e293b" />`
              : `<div class="h-8 w-8 bg-slate-900 text-white flex items-center justify-center font-bold text-sm" style="border: 2px solid #1e293b">${user.name.charAt(0).toUpperCase()}</div>`
          }
          <span class="text-sm font-bold text-slate-900">${user.name}</span>
        </button>

        <!-- DESKTOP: Profile Dropdown Menu -->
        <div
          id="profile-dropdown-menu"
          class="hidden absolute right-6 mt-2 w-48 bg-white shadow-lg z-50"
          style="border: 2px solid #1e293b; top: 60px;"
          role="menu"
        >
          <a href="/profile.html" class="block px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50" role="menuitem">
            <i class="fa-solid fa-user w-5"></i> My Profile
          </a>
          <a href="/listing-create.html" class="block px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50 border-t" style="border-color: #e2e8f0" role="menuitem">
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

        <!-- MOBILE: Hamburger Menu Button (< 1024px) -->
        <button
          id="mobile-menu-btn"
          type="button"
          class="lg:hidden flex items-center justify-center bg-slate-900 px-3 py-2 hover:bg-slate-800"
          style="border: 2px solid #1e293b"
          aria-expanded="false"
          aria-label="Toggle menu"
        >
          <i class="fa-solid fa-bars text-white text-lg"></i>
        </button>
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

        <!-- MOBILE: Hamburger Menu Button for guests (< 1024px) -->
        <button
          id="mobile-menu-btn"
          type="button"
          class="lg:hidden flex items-center justify-center bg-slate-900 px-3 py-2 hover:bg-slate-800"
          style="border: 2px solid #1e293b"
          aria-expanded="false"
          aria-label="Toggle menu"
        >
          <i class="fa-solid fa-bars text-white text-lg"></i>
        </button>
      `
      }
    </div>
  `;
}

/**
 * Render mobile menu drawer
 */
function renderMobileMenu(isUserLoggedIn: boolean, user: any): string {
  return `
    <!-- MOBILE MENU DRAWER -->
    <div
      id="mobile-menu-overlay"
      class="hidden fixed inset-0 bg-slate-900/50 z-40"
    ></div>

    <aside
      id="mobile-menu-drawer"
      class="fixed top-0 right-0 bottom-0 w-80 bg-white transform translate-x-full transition-transform duration-300 ease-in-out z-50 overflow-y-auto"
      style="border-left: 3px solid #1e293b"
    >
      ${
        isUserLoggedIn && user
          ? `
      <!-- Mobile Menu Header - Logged In -->
      <div class="flex items-center justify-between p-4" style="border-bottom: 2px solid #e2e8f0">
        <div class="flex items-center gap-2">
          ${
            user.avatar?.url
              ? `<img src="${user.avatar.url}" alt="${user.name}" class="h-10 w-10 object-cover" style="border: 2px solid #1e293b" />`
              : `<div class="h-10 w-10 bg-slate-900 text-white flex items-center justify-center font-bold" style="border: 2px solid #1e293b">${user.name.charAt(0).toUpperCase()}</div>`
          }
          <div>
            <div class="text-sm font-bold text-slate-900">${user.name}</div>
            <div class="text-xs text-slate-600">${new Intl.NumberFormat('en-US').format(user.credits || 0)} credits</div>
          </div>
        </div>
        <button
          id="mobile-menu-close"
          type="button"
          class="text-slate-600 hover:text-slate-900"
          aria-label="Close menu"
        >
          <i class="fa-solid fa-xmark text-xl"></i>
        </button>
      </div>

      <!-- Mobile Menu Navigation Links -->
      <nav class="p-4">
        <div class="space-y-1">
          <a href="/index.html" class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 rounded transition-colors">
            <i class="fa-solid fa-house text-base w-5"></i>
            <span>Feed</span>
          </a>
          <a href="/collection.html" class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 rounded transition-colors">
            <i class="fa-solid fa-layer-group text-base w-5"></i>
            <span>Catalog</span>
          </a>
          <a href="/profile.html" class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 rounded transition-colors">
            <i class="fa-solid fa-gavel text-base w-5"></i>
            <span>My Bids</span>
          </a>
          <a href="/profile.html" class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 rounded transition-colors">
            <i class="fa-solid fa-user text-base w-5"></i>
            <span>My Profile</span>
          </a>
          <a href="/listing-create.html" class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 rounded transition-colors">
            <i class="fa-solid fa-plus text-base w-5"></i>
            <span>Create Listing</span>
          </a>
        </div>

        <!-- Divider -->
        <div class="my-4" style="border-top: 2px solid #e2e8f0"></div>

        <!-- Logout -->
        <button id="mobile-logout-btn" class="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded transition-colors">
          <i class="fa-solid fa-sign-out-alt text-base w-5"></i>
          <span>Logout</span>
        </button>
      </nav>
      `
          : `
      <!-- Mobile Menu Header - Guest -->
      <div class="flex items-center justify-between p-4" style="border-bottom: 2px solid #e2e8f0">
        <div class="flex items-center gap-2">
          <img src="/images/logo.svg" alt="Aucto" class="h-8" />
        </div>
        <button
          id="mobile-menu-close"
          type="button"
          class="text-slate-600 hover:text-slate-900"
          aria-label="Close menu"
        >
          <i class="fa-solid fa-xmark text-xl"></i>
        </button>
      </div>

      <!-- Mobile Menu Navigation Links -->
      <nav class="p-4">
        <div class="space-y-1">
          <a href="/index.html" class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 rounded transition-colors">
            <i class="fa-solid fa-house text-base w-5"></i>
            <span>Feed</span>
          </a>
          <a href="/collection.html" class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 rounded transition-colors">
            <i class="fa-solid fa-layer-group text-base w-5"></i>
            <span>Catalog</span>
          </a>
          <a href="/login.html" class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 rounded transition-colors">
            <i class="fa-solid fa-gavel text-base w-5"></i>
            <span>My Bids</span>
          </a>
          <a href="/login.html" class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 rounded transition-colors">
            <i class="fa-solid fa-user text-base w-5"></i>
            <span>Profile</span>
          </a>
        </div>

        <!-- Divider -->
        <div class="my-4" style="border-top: 2px solid #e2e8f0"></div>

        <!-- Auth Buttons -->
        <div class="space-y-2">
          <a href="/login.html" class="w-full flex items-center justify-center gap-2 bg-white px-4 py-3 text-sm font-bold tracking-wide text-slate-900 hover:bg-slate-50" style="border: 2px solid #1e293b">
            <i class="fa-solid fa-right-to-bracket text-sm"></i>
            <span>Log in</span>
          </a>
          <a href="/register.html" class="w-full flex items-center justify-center gap-2 bg-slate-900 px-4 py-3 text-sm font-bold tracking-wide text-white hover:bg-slate-800" style="border: 2px solid #1e293b">
            <i class="fa-solid fa-user-plus text-sm"></i>
            <span>Create account</span>
          </a>
        </div>
      </nav>
      `
      }
    </aside>
  `;
}

/**
 * Initialize header event listeners based on page type
 */
function initHeaderEvents(pageType: string): void {
  // Mobile menu drawer
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenuDrawer = document.getElementById('mobile-menu-drawer');
  const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
  const mobileMenuClose = document.getElementById('mobile-menu-close');

  function openMobileMenu() {
    if (mobileMenuDrawer && mobileMenuOverlay && mobileMenuBtn) {
      mobileMenuDrawer.classList.remove('translate-x-full');
      mobileMenuOverlay.classList.remove('hidden');
      mobileMenuBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeMobileMenu() {
    if (mobileMenuDrawer && mobileMenuOverlay && mobileMenuBtn) {
      mobileMenuDrawer.classList.add('translate-x-full');
      mobileMenuOverlay.classList.add('hidden');
      mobileMenuBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  }

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', openMobileMenu);
  }

  if (mobileMenuClose) {
    mobileMenuClose.addEventListener('click', closeMobileMenu);
  }

  if (mobileMenuOverlay) {
    mobileMenuOverlay.addEventListener('click', closeMobileMenu);
  }

  // Desktop profile menu toggle
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

  // Desktop logout button
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

  // Only attach search/filter events on browse pages
  if (pageType === 'browse') {
    initBrowsePageEvents();
  }
}

/**
 * Initialize events specific to browse pages (search, filters)
 */
function initBrowsePageEvents(): void {
  // Mobile search toggle
  const mobileSearchBtn = document.getElementById('mobile-search-btn');
  const mobileSearchBar = document.getElementById('mobile-search-bar');

  if (mobileSearchBtn && mobileSearchBar) {
    mobileSearchBtn.addEventListener('click', () => {
      mobileSearchBar.classList.toggle('hidden');
      const isExpanded = !mobileSearchBar.classList.contains('hidden');
      mobileSearchBtn.setAttribute('aria-expanded', String(isExpanded));

      if (isExpanded) {
        const mobileSearchInput = document.getElementById('mobile-search-input') as HTMLInputElement;
        if (mobileSearchInput) {
          mobileSearchInput.focus();
        }
      }
    });
  }

  // Mobile search form submission
  const mobileSearchForm = document.getElementById('mobile-search-form');
  if (mobileSearchForm) {
    mobileSearchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = mobileSearchForm.querySelector('input[name="q"]') as HTMLInputElement;
      const searchTerm = input.value.trim();

      if (searchTerm) {
        window.location.href = `/index.html?q=${encodeURIComponent(searchTerm)}`;
      }
    });
  }

  // Desktop advanced filters toggle
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

  // Mobile filter toggle
  const mobileToggleFilters = document.getElementById('mobile-toggle-filters');
  const mobileFiltersChevron = document.getElementById('mobile-filters-chevron');

  if (mobileToggleFilters && filtersBar) {
    mobileToggleFilters.addEventListener('click', () => {
      const isOpen = !filtersBar.classList.contains('hidden');
      filtersBar.classList.toggle('hidden');
      mobileToggleFilters.setAttribute('aria-expanded', String(!isOpen));

      if (mobileFiltersChevron) {
        mobileFiltersChevron.classList.toggle('rotate-180');
      }
    });
  }

  // Filter buttons (tag filtering) - category filtering
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
          icon.classList.remove('fa-check');
        }
      });

      btn.classList.remove('bg-white', 'text-slate-700');
      btn.classList.add('bg-slate-900', 'text-white');
      btn.setAttribute('aria-pressed', 'true');

      // Add check icon to first icon
      const icon = btn.querySelector('i:first-child');
      if (icon && !icon.classList.contains('fa-check')) {
        icon.classList.add('fa-check');
      }

      // Dispatch custom event for filtering
      const filterValue = btn.getAttribute('data-filter');
      document.dispatchEvent(new CustomEvent('categoryFilterChange', { detail: { category: filterValue } }));
    });
  });

  // Desktop search form submission
  const headerSearchForm = document.getElementById('header-search-form');
  const globalSearchInput = document.getElementById('global-search-input') as HTMLInputElement;

  if (headerSearchForm) {
    headerSearchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = headerSearchForm.querySelector('input[name="q"]') as HTMLInputElement;
      const searchTerm = input.value.trim();

      // Dispatch search event for same-page filtering
      document.dispatchEvent(new CustomEvent('globalSearchSubmit', { detail: { query: searchTerm } }));

      // For cross-page navigation, only navigate if not on index or collection pages
      const currentPath = window.location.pathname;
      if (searchTerm && !currentPath.includes('index.html') && !currentPath.includes('collection.html')) {
        window.location.href = `/index.html?q=${encodeURIComponent(searchTerm)}`;
      }
    });
  }

  // Real-time search input for instant filtering
  if (globalSearchInput) {
    let searchTimeout: ReturnType<typeof setTimeout>;
    globalSearchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const searchTerm = globalSearchInput.value.trim();
        document.dispatchEvent(new CustomEvent('globalSearchInput', { detail: { query: searchTerm } }));
      }, 300); // Debounce
    });
  }

  // Active only checkbox
  const activeOnlyCheckbox = document.getElementById('active-only-filter') as HTMLInputElement;
  if (activeOnlyCheckbox) {
    activeOnlyCheckbox.addEventListener('change', () => {
      document.dispatchEvent(
        new CustomEvent('activeOnlyChange', {
          detail: { activeOnly: activeOnlyCheckbox.checked },
        })
      );
    });
  }

  // Sort filter
  const sortFilterSelect = document.getElementById('sort-filter-select') as HTMLSelectElement;
  if (sortFilterSelect) {
    sortFilterSelect.addEventListener('change', () => {
      const value = sortFilterSelect.value;
      const [sort, order] = value.split('-');
      document.dispatchEvent(new CustomEvent('sortChange', { detail: { sort, order } }));
    });
  }
}
