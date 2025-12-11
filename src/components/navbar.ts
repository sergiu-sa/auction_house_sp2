import { isLoggedIn, getCurrentUser } from '../utils/auth';
import { logout } from '../api/auth';
import { renderGuestBanner } from './guestBanner';
import { getProfile } from '../api/profile';
import { setUser } from '../utils/storage';
import {
  renderCategoryFilters,
  renderActiveOnlyCheckbox,
  renderSortDropdown,
  initCategoryFilters,
  initActiveOnlyCheckbox,
  initSortDropdown,
} from './filters';
import type { User } from '../types/api';

// Cache for user profile data with 30-second TTL
let profileCache: { data: User; timestamp: number } | null = null;
const CACHE_TTL = 30000; // 30 seconds

/**
 * Render the header/navigation component
 * Fetches fresh user data to ensure credits are up to date (with 30s cache)
 * Renders different navbar variants based on data-page-type attribute
 */
export async function renderHeader(): Promise<void> {
  const header = document.getElementById('header');
  if (!header) return;

  // Detect page type from body attribute
  const pageType = document.body.getAttribute('data-page-type') || 'browse';

  const isUserLoggedIn = isLoggedIn();
  let user = getCurrentUser();

  // Fetch fresh user data if logged in to get updated credits (with cache)
  if (isUserLoggedIn && user) {
    const now = Date.now();
    const cacheValid = profileCache && (now - profileCache.timestamp) < CACHE_TTL;

    if (cacheValid) {
      // Use cached data
      user = profileCache!.data;
    } else {
      // Fetch fresh data
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

          // Update cache
          profileCache = { data: updatedUser, timestamp: now };
        }
      } catch (error) {
        // If fetch fails, continue with cached user data
        console.error('Failed to fetch fresh user data:', error);
      }
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
    <nav aria-label="Main navigation" style="background-color: #f7f7f5">
      <div class="mx-auto max-w-7xl px-6 md:px-8 pt-5">
        <div class="flex items-center justify-between gap-6 pb-4" style="border-bottom: 1px solid #e2e8f0">
          <!-- Brand Logo -->
          <a href="/index.html" class="inline-flex items-center text-slate-900 hover:text-slate-700 transition-colors whitespace-nowrap flex-shrink-0" aria-label="Aucto home">
            <img src="/images/logo_v2.svg" alt="Aucto logo" class="h-9" width="120" height="36" />
          </a>

          <!-- Browse as Guest link -->
          <a
            href="/index.html"
            class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-700 hover:text-slate-900 transition-colors bg-white"
            style="border: 2px solid #cbd5e1"
            aria-label="Browse auction listings as guest"
          >
            <span>Browse as Guest</span>
            <i class="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i>
          </a>
        </div>
      </div>
    </nav>
  `;
}

/**
 * Render simple navbar for user content pages (profile, create/edit listing)
 */
function renderSimpleNavbar(isUserLoggedIn: boolean, user: User | null): string {
  return `
    <nav aria-label="Main navigation" style="background-color: #f7f7f5">
      <div class="mx-auto max-w-7xl px-6 md:px-8 pt-5">
        <div class="flex items-center justify-between gap-6 pb-4" style="border-bottom: 1px solid #e2e8f0">

          <!-- Brand Logo -->
          <a href="/index.html" class="inline-flex items-center text-slate-900 hover:text-slate-700 transition-colors whitespace-nowrap flex-shrink-0" aria-label="Aucto home">
            <img src="/images/logo_v2.svg" alt="Aucto logo" class="h-9" width="120" height="36" />
          </a>

          <!-- DESKTOP: Primary nav links (≥1024px) -->
          <div class="hidden lg:flex items-center gap-6 text-sm font-bold text-slate-700">
            <a href="/index.html" class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5" aria-label="Feed">
              <i class="fa-solid fa-house text-sm" aria-hidden="true"></i>
              <span>Feed</span>
            </a>
            <a href="/collection.html" class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5" aria-label="Catalog">
              <i class="fa-solid fa-layer-group text-sm" aria-hidden="true"></i>
              <span>Catalog</span>
            </a>
            ${
              isUserLoggedIn
                ? `
            <a href="/listing-create.html" class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5" aria-label="Create listing">
              <i class="fa-solid fa-gavel text-sm" aria-hidden="true"></i>
              <span>Create</span>
            </a>
            <a href="/profile.html" class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5" aria-label="Profile">
              <i class="fa-solid fa-user text-sm" aria-hidden="true"></i>
              <span>Profile</span>
            </a>
            `
                : `
            <a href="/login.html?redirect=/listing-create.html" class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5" aria-label="Create listing (login required)">
              <i class="fa-solid fa-gavel text-sm" aria-hidden="true"></i>
              <span>Create</span>
            </a>
            <a href="/login.html" class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5" aria-label="Profile (login required)">
              <i class="fa-solid fa-user text-sm" aria-hidden="true"></i>
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
function renderFullNavbar(isUserLoggedIn: boolean, user: User | null): string {
  return `
    <nav aria-label="Main navigation" style="background-color: #f7f7f5">
      <div class="mx-auto max-w-7xl px-6 md:px-8 pt-5">
        <!-- Top row: brand + search + nav + credits -->
        <div class="flex items-center gap-3 pb-4" style="border-bottom: 1px solid #e2e8f0">

          <!-- Brand Logo - Always visible -->
          <a href="/index.html" class="inline-flex items-center text-slate-900 hover:text-slate-700 transition-colors whitespace-nowrap flex-shrink-0" aria-label="Aucto home">
            <img src="/images/logo_v2.svg" alt="Aucto logo" class="h-9" width="120" height="36" />
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
                <i class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 fa-solid fa-magnifying-glass text-sm text-slate-400" aria-hidden="true"></i>
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
              aria-label="Toggle advanced filters"
            >
              <i class="fa-solid fa-sliders text-sm" aria-hidden="true"></i>
              <i class="fa-solid fa-chevron-down text-xs transition-transform" id="filters-chevron" aria-hidden="true"></i>
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
            <a href="/index.html" class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5" aria-label="Feed">
              <i class="fa-solid fa-house text-sm" aria-hidden="true"></i>
              <span>Feed</span>
            </a>
            <a href="/collection.html" class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5" aria-label="Catalog">
              <i class="fa-solid fa-layer-group text-sm" aria-hidden="true"></i>
              <span>Catalog</span>
            </a>
            ${
              isUserLoggedIn
                ? `
            <a href="/listing-create.html" class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5" aria-label="Create listing">
              <i class="fa-solid fa-gavel text-sm" aria-hidden="true"></i>
              <span>Create</span>
            </a>
            <a href="/profile.html" class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5" aria-label="Profile">
              <i class="fa-solid fa-user text-sm" aria-hidden="true"></i>
              <span>Profile</span>
            </a>
            `
                : `
            <a href="/login.html?redirect=/listing-create.html" class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5" aria-label="Create listing (login required)">
              <i class="fa-solid fa-gavel text-sm" aria-hidden="true"></i>
              <span>Create</span>
            </a>
            <a href="/login.html" class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5" aria-label="Profile (login required)">
              <i class="fa-solid fa-user text-sm" aria-hidden="true"></i>
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
              <i class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 fa-solid fa-magnifying-glass text-sm text-slate-400" aria-hidden="true"></i>
            </div>
          </form>

          <!-- Filters button for mobile -->
          <button
            id="mobile-toggle-filters"
            type="button"
            class="mt-3 w-full flex items-center justify-center gap-2 bg-white px-4 py-2 hover:bg-slate-50"
            style="border: 2px solid #334155"
            aria-expanded="false"
            aria-controls="advanced-filters-bar"
            aria-label="Toggle filters"
          >
            <i class="fa-solid fa-sliders text-sm" aria-hidden="true"></i>
            <span class="text-[11px] font-bold tracking-[0.18em] uppercase">Filters</span>
            <i class="fa-solid fa-chevron-down text-xs transition-transform" id="mobile-filters-chevron" aria-hidden="true"></i>
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
            ${renderCategoryFilters({ dataAttribute: 'data-filter', variant: 'normal' })}

            <!-- Filters + Sort -->
            <div class="flex flex-wrap items-center gap-3 text-sm">
              ${renderActiveOnlyCheckbox({ id: 'active-only-filter', variant: 'normal' })}
              ${renderSortDropdown({ id: 'sort-filter-select', variant: 'normal' })}
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
function renderUserSection(isUserLoggedIn: boolean, user: User | null): string {
  return `
    <div class="flex items-center gap-3">
      ${
        isUserLoggedIn && user
          ? `
        <!-- Logged In User -->
        <!-- Credits Box -->
        <div class="hidden items-center gap-2 bg-slate-50 px-4 py-2 sm:flex" style="border: 2px solid #1e293b" aria-label="User credits">
          <span class="text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500">Credits</span>
          <span class="text-base font-bold text-slate-900" aria-label="${new Intl.NumberFormat('en-US').format(user.credits || 0)} credits">${new Intl.NumberFormat('en-US').format(user.credits || 0)}</span>
        </div>

        <!-- DESKTOP: Profile Button  -->
        <div class="hidden lg:block relative">
          <button
            id="profile-menu-btn"
            class="flex items-center gap-2 bg-white px-4 py-2 hover:bg-slate-50 transition-colors"
            style="border: 3px solid #1e293b"
            aria-expanded="false"
            aria-haspopup="true"
            aria-label="Open profile menu"
          >
            ${
              user.avatar?.url
                ? `<img src="${user.avatar.url}" alt="${user.name} avatar" class="h-8 w-8 object-cover" width="32" height="32" loading="lazy" referrerpolicy="no-referrer" style="border: 2px solid #1e293b" />`
                : `<div class="h-8 w-8 bg-slate-900 text-white flex items-center justify-center font-bold text-sm" style="border: 2px solid #1e293b" aria-hidden="true">${user.name.charAt(0).toUpperCase()}</div>`
            }
            <span class="text-sm font-bold text-slate-900">${user.name}</span>
            <i class="fa-solid fa-chevron-down text-xs text-slate-500 transition-transform" id="profile-menu-chevron" aria-hidden="true"></i>
          </button>

          <!-- DESKTOP: Profile Dropdown Menu (positioned relative to button) -->
          <div
            id="profile-dropdown-menu"
            class="hidden absolute right-0 mt-2 w-56 bg-white shadow-2xl z-50 transform origin-top-right transition-all"
            style="border: 3px solid #1e293b"
            role="menu"
            aria-label="Profile menu"
          >
            <!-- User info header -->
            <div class="px-4 py-3 bg-slate-50" style="border-bottom: 2px solid #e2e8f0">
              <div class="flex items-center gap-3">
                ${
                  user.avatar?.url
                    ? `<img src="${user.avatar.url}" alt="${user.name} avatar" class="h-10 w-10 object-cover" width="40" height="40" loading="lazy" referrerpolicy="no-referrer" style="border: 2px solid #1e293b" />`
                    : `<div class="h-10 w-10 bg-slate-900 text-white flex items-center justify-center font-bold" style="border: 2px solid #1e293b" aria-hidden="true">${user.name.charAt(0).toUpperCase()}</div>`
                }
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-bold text-slate-900 truncate">${user.name}</p>
                  <p class="text-[11px] text-slate-500 truncate">${user.email || ''}</p>
                </div>
              </div>
              <!-- Credits display -->
              <div class="mt-2 flex items-center justify-between px-2 py-1.5 bg-white" style="border: 2px solid #cbd5e1">
                <span class="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500">Credits</span>
                <span class="text-sm font-bold text-slate-900">${new Intl.NumberFormat('en-US').format(user.credits || 0)}</span>
              </div>
            </div>

            <!-- Menu items -->
            <div class="py-1">
              <a href="/profile.html" class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 transition-colors" role="menuitem">
                <i class="fa-solid fa-user w-5 text-slate-600" aria-hidden="true"></i>
                <span>My Profile</span>
              </a>
              <a href="/listing-create.html" class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 transition-colors border-t" style="border-color: #e2e8f0" role="menuitem">
                <i class="fa-solid fa-plus w-5 text-slate-600" aria-hidden="true"></i>
                <span>Create Listing</span>
              </a>
              <button
                id="logout-btn"
                class="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-50 transition-colors border-t"
                style="border-color: #e2e8f0"
                role="menuitem"
              >
                <i class="fa-solid fa-sign-out-alt w-5" aria-hidden="true"></i>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>

        <!-- MOBILE: Hamburger Menu Button (< 1024px) -->
        <button
          id="mobile-menu-btn"
          type="button"
          class="lg:hidden flex items-center justify-center bg-slate-900 px-2.5 py-2 hover:bg-slate-800"
          style="border: 2px solid #1e293b"
          aria-expanded="false"
          aria-label="Toggle menu"
        >
          <i class="fa-solid fa-bars text-white text-base"></i>
        </button>
      `
          : `
        <!-- Guest Navigation -->
        <a
          href="/login.html"
          class="hidden bg-white px-4 py-2 text-sm font-bold tracking-wide text-slate-900 hover:bg-slate-50 md:inline-flex items-center gap-2"
          style="border: 2px solid #1e293b"
          aria-label="Log in to your account"
        >
          <i class="fa-solid fa-right-to-bracket text-sm" aria-hidden="true"></i>
          Log in
        </a>

        <!-- DESKTOP: Create Account Button -->
        <a
          href="/register.html"
          class="hidden lg:inline-flex items-center gap-2 bg-slate-900 px-5 py-2 text-sm font-bold tracking-wide text-white hover:bg-slate-800"
          style="border: 2px solid #1e293b"
          aria-label="Create new account"
        >
          <i class="fa-solid fa-user-plus text-sm" aria-hidden="true"></i>
          Create account
        </a>

        <!-- TABLET: Create Account Button -->
        <a
          href="/register.html"
          class="hidden sm:inline-flex lg:hidden items-center gap-1.5 bg-slate-900 px-3 py-2 text-xs font-bold tracking-wide text-white hover:bg-slate-800"
          style="border: 2px solid #1e293b"
          aria-label="Create new account"
        >
          <i class="fa-solid fa-user-plus text-xs" aria-hidden="true"></i>
          <span>Sign up</span>
        </a>

        <!-- MOBILE: Hamburger Menu Button for guests (< 1024px) -->
        <button
          id="mobile-menu-btn"
          type="button"
          class="lg:hidden flex items-center justify-center bg-slate-900 px-2.5 py-2 hover:bg-slate-800"
          style="border: 2px solid #1e293b"
          aria-expanded="false"
          aria-label="Toggle menu"
        >
          <i class="fa-solid fa-bars text-white text-base"></i>
        </button>
      `
      }
    </div>
  `;
}

/**
 * Render mobile menu drawer
 */
function renderMobileMenu(isUserLoggedIn: boolean, user: User | null): string {
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
      role="dialog"
      aria-label="Mobile menu"
      aria-modal="true"
    >
      ${
        isUserLoggedIn && user
          ? `
      <!-- Mobile Menu Header - Logged In -->
      <div class="flex items-center justify-between p-4" style="border-bottom: 2px solid #e2e8f0">
        <div class="flex items-center gap-2">
          ${
            user.avatar?.url
              ? `<img src="${user.avatar.url}" alt="${user.name} avatar" class="h-10 w-10 object-cover" width="40" height="40" loading="lazy" referrerpolicy="no-referrer" style="border: 2px solid #1e293b" />`
              : `<div class="h-10 w-10 bg-slate-900 text-white flex items-center justify-center font-bold" style="border: 2px solid #1e293b" aria-hidden="true">${user.name.charAt(0).toUpperCase()}</div>`
          }
          <div>
            <div class="text-sm font-bold text-slate-900">${user.name}</div>
            <div class="text-xs text-slate-600" aria-label="${new Intl.NumberFormat('en-US').format(user.credits || 0)} credits">${new Intl.NumberFormat('en-US').format(user.credits || 0)} credits</div>
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
      <nav class="p-4" aria-label="Mobile navigation">
        <div class="space-y-1">
          <a href="/index.html" class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 rounded transition-colors" aria-label="Feed">
            <i class="fa-solid fa-house text-base w-5" aria-hidden="true"></i>
            <span>Feed</span>
          </a>
          <a href="/collection.html" class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 rounded transition-colors" aria-label="Catalog">
            <i class="fa-solid fa-layer-group text-base w-5" aria-hidden="true"></i>
            <span>Catalog</span>
          </a>
          <a href="/listing-create.html" class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 rounded transition-colors" aria-label="Create listing">
            <i class="fa-solid fa-gavel text-base w-5" aria-hidden="true"></i>
            <span>Create</span>
          </a>
          <a href="/profile.html" class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 rounded transition-colors" aria-label="My profile">
            <i class="fa-solid fa-user text-base w-5" aria-hidden="true"></i>
            <span>My Profile</span>
          </a>
        </div>

        <!-- Divider -->
        <div class="my-4" style="border-top: 2px solid #e2e8f0"></div>

        <!-- Logout -->
        <button id="mobile-logout-btn" class="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded transition-colors" aria-label="Logout">
          <i class="fa-solid fa-sign-out-alt text-base w-5" aria-hidden="true"></i>
          <span>Logout</span>
        </button>
      </nav>
      `
          : `
      <!-- Mobile Menu Header - Guest -->
      <div class="flex items-center justify-between p-4" style="border-bottom: 2px solid #e2e8f0">
        <div class="flex items-center gap-2">
          <img src="/images/logo_v2.svg" alt="Aucto logo" class="h-8" width="107" height="32" />
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
      <nav class="p-4" aria-label="Mobile navigation">
        <div class="space-y-1">
          <a href="/index.html" class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 rounded transition-colors" aria-label="Feed">
            <i class="fa-solid fa-house text-base w-5" aria-hidden="true"></i>
            <span>Feed</span>
          </a>
          <a href="/collection.html" class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 rounded transition-colors" aria-label="Catalog">
            <i class="fa-solid fa-layer-group text-base w-5" aria-hidden="true"></i>
            <span>Catalog</span>
          </a>
          <a href="/login.html?redirect=/listing-create.html" class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 rounded transition-colors" aria-label="Create listing (login required)">
            <i class="fa-solid fa-gavel text-base w-5" aria-hidden="true"></i>
            <span>Create</span>
          </a>
          <a href="/login.html" class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 rounded transition-colors" aria-label="Profile (login required)">
            <i class="fa-solid fa-user text-base w-5" aria-hidden="true"></i>
            <span>Profile</span>
          </a>
        </div>

        <!-- Divider -->
        <div class="my-4" style="border-top: 2px solid #e2e8f0"></div>

        <!-- Auth Buttons -->
        <div class="space-y-2">
          <a href="/login.html" class="w-full flex items-center justify-center gap-2 bg-white px-4 py-3 text-sm font-bold tracking-wide text-slate-900 hover:bg-slate-50" style="border: 2px solid #1e293b" aria-label="Log in to your account">
            <i class="fa-solid fa-right-to-bracket text-sm" aria-hidden="true"></i>
            <span>Log in</span>
          </a>
          <a href="/register.html" class="w-full flex items-center justify-center gap-2 bg-slate-900 px-4 py-3 text-sm font-bold tracking-wide text-white hover:bg-slate-800" style="border: 2px solid #1e293b" aria-label="Create new account">
            <i class="fa-solid fa-user-plus text-sm" aria-hidden="true"></i>
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
  const profileMenuChevron = document.getElementById('profile-menu-chevron');

  if (profileMenuBtn && profileDropdownMenu) {
    profileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !profileDropdownMenu.classList.contains('hidden');
      profileDropdownMenu.classList.toggle('hidden');
      profileMenuBtn.setAttribute('aria-expanded', String(!isOpen));

      // Rotate chevron icon
      if (profileMenuChevron) {
        if (isOpen) {
          profileMenuChevron.classList.remove('rotate-180');
        } else {
          profileMenuChevron.classList.add('rotate-180');
        }
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      if (!profileDropdownMenu.classList.contains('hidden')) {
        profileDropdownMenu.classList.add('hidden');
        profileMenuBtn.setAttribute('aria-expanded', 'false');

        // Reset chevron rotation
        if (profileMenuChevron) {
          profileMenuChevron.classList.remove('rotate-180');
        }
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
  // Get filter elements
  const filtersBar = document.getElementById('advanced-filters-bar');
  const mobileToggleFilters = document.getElementById('mobile-toggle-filters');
  const mobileFiltersChevron = document.getElementById('mobile-filters-chevron');

  // Mobile search toggle
  const mobileSearchBtn = document.getElementById('mobile-search-btn');
  const mobileSearchBar = document.getElementById('mobile-search-bar');

  if (mobileSearchBtn && mobileSearchBar) {
    mobileSearchBtn.addEventListener('click', () => {
      mobileSearchBar.classList.toggle('hidden');
      const isExpanded = !mobileSearchBar.classList.contains('hidden');
      mobileSearchBtn.setAttribute('aria-expanded', String(isExpanded));

      // Close filters when closing search bar
      if (!isExpanded && filtersBar && !filtersBar.classList.contains('hidden')) {
        filtersBar.classList.add('hidden');
        if (mobileToggleFilters) {
          mobileToggleFilters.setAttribute('aria-expanded', 'false');
        }
        if (mobileFiltersChevron) {
          mobileFiltersChevron.classList.remove('rotate-180');
        }
      }

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

  // Initialize category filters using component
  initCategoryFilters('data-filter');

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

  // Initialize active-only checkbox using component
  initActiveOnlyCheckbox('active-only-filter');

  // Initialize sort dropdown using component
  initSortDropdown('sort-filter-select');
}
