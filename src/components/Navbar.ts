import { fetchFreshProfile } from '../utils/profileCache';
import { mountAnnouncer } from '../utils/announce';
import { trapFocus } from '../utils/focusTrap';
import { isLoggedIn, getCurrentUser } from '../utils/auth';
import { logout } from '../api/auth';
import { renderGuestBanner } from './GuestBanner';
import {
  renderCategoryFilters,
  renderActiveOnlyCheckbox,
  renderSortDropdown,
  initCategoryFilters,
  initActiveOnlyCheckbox,
  initSortDropdown,
  setActiveCategory,
  setActiveOnlyState,
  setSortValue,
} from './filters';
import type { User } from '../types/api';
import { escapeHtml } from '../utils/escapeHtml';
import { initIdentityFallbacks } from '../utils/listingImage';
import { renderAvatar } from './Avatar';

interface NavLink {
  href: string;
  label: string;
  icon: string;
  ariaLabel: string;
}

// Guest users rerouted to login for Create and Profile, with redirect preserved.
function getNavLinks(
  isLoggedIn: boolean,
  profileLabel: 'Profile' | 'My Profile' = 'Profile'
): NavLink[] {
  return [
    { href: '/index.html', label: 'Feed', icon: 'fa-house', ariaLabel: 'Feed' },
    {
      href: '/collection.html',
      label: 'Catalog',
      icon: 'fa-layer-group',
      ariaLabel: 'Catalog',
    },
    isLoggedIn
      ? {
          href: '/listing-create.html',
          label: 'Create',
          icon: 'fa-gavel',
          ariaLabel: 'Create listing',
        }
      : {
          href: '/login.html?redirect=/listing-create.html',
          label: 'Create',
          icon: 'fa-gavel',
          ariaLabel: 'Create listing (login required)',
        },
    isLoggedIn
      ? {
          href: '/profile.html',
          label: profileLabel,
          icon: 'fa-user',
          ariaLabel: profileLabel === 'My Profile' ? 'My profile' : 'Profile',
        }
      : {
          href: '/login.html',
          label: 'Profile',
          icon: 'fa-user',
          ariaLabel: 'Profile (login required)',
        },
  ];
}

/** Desktop nav-link row used inside both `renderSimpleNavbar` and `renderFullNavbar`. */
function renderDesktopNavLinks(isLoggedIn: boolean): string {
  return getNavLinks(isLoggedIn)
    .map(
      (link) => `
        <a href="${link.href}" class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5" aria-label="${link.ariaLabel}">
          <i class="fa-solid ${link.icon} text-sm" aria-hidden="true"></i>
          <span>${link.label}</span>
        </a>
      `
    )
    .join('');
}

/** Mobile drawer nav-link list — wider hit targets, slightly different chrome. */
function renderMobileNavLinks(isLoggedIn: boolean): string {
  return getNavLinks(isLoggedIn, isLoggedIn ? 'My Profile' : 'Profile')
    .map(
      (link) => `
        <a href="${link.href}" class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 rounded transition-colors" aria-label="${link.ariaLabel}">
          <i class="fa-solid ${link.icon} text-base w-5" aria-hidden="true"></i>
          <span>${link.label}</span>
        </a>
      `
    )
    .join('');
}

/**
 * Render the navbar from the stored user, and refresh the credit figure afterwards.
 *
 * It used to await the profile fetch, which every page then awaited before starting its own requests.
 * `localStorage` already holds the name, avatar and credits this markup needs, and they are the values the last fetch wrote, so the fresh response usually paints the same number.
 */
export function renderHeader(): void {
  mountAnnouncer();

  const header = document.getElementById('header');
  if (!header) return;

  // Detect page type from body attribute
  const pageType = document.body.getAttribute('data-page-type') || 'browse';

  const isUserLoggedIn = isLoggedIn();
  const user = getCurrentUser();

  // Before the markup below, not after it:
  //   main.css reserves the header's height from this  attribute, and leaving it unset until the markup lands holds the page on the guest reservation and then collapses it, which is a bigger shift than the one being avoided.
  document.documentElement.dataset.auth = isUserLoggedIn ? 'in' : 'out';

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

  initIdentityFallbacks(header);

  // Initialize event listeners
  initHeaderEvents(pageType);

  // Not on auth pages:
  //  renderMinimalNavbar draws no credit figures, so the response would have nowhere to land.
  if (isUserLoggedIn && user && pageType !== 'auth') {
    void refreshHeaderCredits();
  }
}

/**
 * Repaint the credit figure once the server's number arrives, without holding up the page.
 *
 * Only credits:
 *  the name cannot change and the avatar is written to storage by the page that edits it, so the synchronous render above already has both.
 */
async function refreshHeaderCredits(): Promise<void> {
  const freshUser = await fetchFreshProfile();
  if (freshUser) {
    updateHeaderCredits(freshUser.credits || 0);
  }
}

// Minimal navbar for auth pages (login, register)
function renderMinimalNavbar(): string {
  return `
    <nav aria-label="Main navigation" style="background-color: #f7f7f5">
      <div class="mx-auto max-w-7xl px-6 md:px-8 pt-5">
        <div class="flex items-center justify-between gap-6 pb-4" style="border-bottom: 1px solid var(--aucto-border-light)">
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

// Simple navbar for user content pages (profile, create/edit listing)
function renderSimpleNavbar(
  isUserLoggedIn: boolean,
  user: User | null
): string {
  return `
    <nav aria-label="Main navigation" style="background-color: #f7f7f5">
      <div class="mx-auto max-w-7xl px-6 md:px-8 pt-5">
        <div class="flex items-center justify-between gap-6 pb-4" style="border-bottom: 1px solid var(--aucto-border-light)">

          <!-- Brand Logo -->
          <a href="/index.html" class="inline-flex items-center text-slate-900 hover:text-slate-700 transition-colors whitespace-nowrap flex-shrink-0" aria-label="Aucto home">
            <img src="/images/logo_v2.svg" alt="Aucto logo" class="h-9" width="120" height="36" />
          </a>

          <!-- DESKTOP: Primary nav links (≥1024px) -->
          <div class="hidden lg:flex items-center gap-6 text-sm font-bold text-slate-700">
            ${renderDesktopNavLinks(isUserLoggedIn)}
          </div>

          ${renderUserSection(isUserLoggedIn, user)}
        </div>
      </div>
    </nav>

    ${renderMobileMenu(isUserLoggedIn, user)}
  `;
}

// Full navbar for browse pages (index, collection, listing details)
function renderFullNavbar(isUserLoggedIn: boolean, user: User | null): string {
  return `
    <nav aria-label="Main navigation" style="background-color: #f7f7f5">
      <div class="mx-auto max-w-7xl px-6 md:px-8 pt-5">
        <!-- Top row: brand + search + nav + credits -->
        <div class="flex items-center gap-3 pb-4" style="border-bottom: 1px solid var(--aucto-border-light)">

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
                  class="w-full bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline focus:outline-[3px] focus:outline-aucto-red focus:outline-offset-2"
                  style="border: 2px solid var(--aucto-border-mid)"
                />
                <i class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 fa-solid fa-magnifying-glass text-sm text-slate-400" aria-hidden="true"></i>
              </div>
            </form>

            <!-- Filters pill -->
            <button
              id="toggle-advanced-filters"
              type="button"
              class="flex items-center gap-2 bg-white px-3 py-2 hover:bg-slate-50"
              style="border: 2px solid var(--aucto-border-mid)"
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
            style="border: 2px solid var(--aucto-border-mid)"
            aria-label="Toggle search"
            aria-expanded="false"
          >
            <i class="fa-solid fa-magnifying-glass text-sm" aria-hidden="true"></i>
          </button>

          <!-- DESKTOP: Primary nav links (≥1024px) -->
          <div class="hidden items-center gap-6 text-sm font-bold text-slate-700 lg:flex">
            ${renderDesktopNavLinks(isUserLoggedIn)}
          </div>

          ${renderUserSection(isUserLoggedIn, user)}
        </div>

        <!-- MOBILE SEARCH BAR (expandable, hidden by default) -->
        <div
          id="mobile-search-bar"
          class="hidden lg:hidden px-2 py-4"
          style="border-bottom: 1px solid var(--aucto-border-light)"
        >
          <form role="search" aria-label="Search auctions" id="mobile-search-form">
            <label for="mobile-search-input" class="sr-only">Search auctions</label>
            <div class="relative">
              <input
                id="mobile-search-input"
                name="q"
                type="search"
                placeholder="Search auctions..."
                class="w-full bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline focus:outline-[3px] focus:outline-aucto-red focus:outline-offset-2"
                style="border: 2px solid var(--aucto-border-mid)"
              />
              <i class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 fa-solid fa-magnifying-glass text-sm text-slate-400" aria-hidden="true"></i>
            </div>
          </form>

          <!-- Filters button for mobile -->
          <button
            id="mobile-toggle-filters"
            type="button"
            class="mt-3 w-full flex items-center justify-center gap-2 bg-white px-4 py-2 hover:bg-slate-50"
            style="border: 2px solid var(--aucto-border-mid)"
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
              ${renderSortDropdown({ id: 'sort-filter-select', variant: 'normal', label: 'Sort listings' })}
            </div>
          </div>
        </div>
      </div>
    </nav>

    ${renderMobileMenu(isUserLoggedIn, user)}
  `;
}

/**
 * Update the credit figures already on screen, for pages that spend credits without navigating.
 * Re-rendering the whole header instead would re-bind its document-level listeners on every call.
 */
export function updateHeaderCredits(credits: number): void {
  const formatted = new Intl.NumberFormat('en-US').format(credits);

  for (const [id, text] of [
    ['navbar-credits', formatted],
    ['navbar-menu-credits', `${formatted} credits`],
  ]) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.textContent = text;
    el.setAttribute('aria-label', `${formatted} credits`);
  }
}

// User section: credits + profile dropdown for logged-in users, auth buttons for guests
function renderUserSection(isUserLoggedIn: boolean, user: User | null): string {
  return `
    <div class="flex items-center gap-3">
      ${
        isUserLoggedIn && user
          ? `
        <!-- Logged In User -->
        <!-- Credits Box -->
        <div class="hidden items-center gap-2 bg-slate-50 px-4 py-2 sm:flex" style="border: 3px solid var(--aucto-border-dark)" aria-label="User credits">
          <span class="text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500">Credits</span>
          <span id="navbar-credits" class="text-base font-bold text-slate-900" aria-label="${new Intl.NumberFormat('en-US').format(user.credits || 0)} credits">${new Intl.NumberFormat('en-US').format(user.credits || 0)}</span>
        </div>

        <!-- DESKTOP: Profile Button  -->
        <div class="hidden lg:block relative">
          <button
            id="profile-menu-btn"
            class="flex items-center gap-2 bg-white px-4 py-2 hover:bg-slate-50 transition-colors"
            style="border: 3px solid var(--aucto-border-dark)"
            aria-expanded="false"
            aria-controls="profile-dropdown-menu"
          >
            ${renderAvatar({
              url: user.avatar?.url,
              name: user.name,
              sizeClass: 'h-8 w-8',
              textClass: 'text-sm',
              borderStyle: 'border: 2px solid var(--aucto-border-dark)',
              // The button names itself from the visible username beside this.
              alt: '',
            })}
            <span class="text-sm font-bold text-slate-900">${escapeHtml(user.name)}</span>
            <i class="fa-solid fa-chevron-down text-xs text-slate-500 transition-transform" id="profile-menu-chevron" aria-hidden="true"></i>
          </button>

          <!-- DESKTOP: Profile Dropdown Menu  -->
          <div
            id="profile-dropdown-menu"
            class="hidden absolute right-0 mt-2 w-56 bg-white shadow-2xl z-50 transform origin-top-right transition-all"
            style="border: 3px solid var(--aucto-border-dark)"
          >
            <!-- Menu items -->
            <div class="py-1">
              <a href="/profile.html" class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 transition-colors">
                <i class="fa-solid fa-user w-5 text-slate-600" aria-hidden="true"></i>
                <span>My Profile</span>
              </a>
              <a href="/listing-create.html" class="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 transition-colors border-t" style="border-color: var(--aucto-border-light)">
                <i class="fa-solid fa-plus w-5 text-slate-600" aria-hidden="true"></i>
                <span>Create Listing</span>
              </a>
              <button
                id="logout-btn"
                class="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-50 transition-colors border-t"
                style="border-color: var(--aucto-border-light)"
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
          style="border: 2px solid var(--aucto-border-dark)"
          aria-expanded="false"
          aria-label="Toggle menu"
        >
          <i class="fa-solid fa-bars text-white text-base" aria-hidden="true"></i>
        </button>
      `
          : `
        <!-- Guest Navigation -->
        <a
          href="/login.html"
          class="hidden bg-white px-4 py-2 text-sm font-bold tracking-wide text-slate-900 hover:bg-slate-50 md:inline-flex items-center gap-2"
          style="border: 2px solid var(--aucto-border-dark)"
          aria-label="Log in to your account"
        >
          <i class="fa-solid fa-right-to-bracket text-sm" aria-hidden="true"></i>
          Log in
        </a>

        <!-- DESKTOP: Create Account Button -->
        <a
          href="/register.html"
          class="hidden lg:inline-flex items-center gap-2 bg-slate-900 px-5 py-2 text-sm font-bold tracking-wide text-white hover:bg-slate-800"
          style="border: 2px solid var(--aucto-border-dark)"
          aria-label="Create new account"
        >
          <i class="fa-solid fa-user-plus text-sm" aria-hidden="true"></i>
          Create account
        </a>

        <!-- TABLET: Create Account Button -->
        <a
          href="/register.html"
          class="hidden sm:inline-flex lg:hidden items-center gap-1.5 bg-slate-900 px-3 py-2 text-xs font-bold tracking-wide text-white hover:bg-slate-800"
          style="border: 2px solid var(--aucto-border-dark)"
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
          style="border: 2px solid var(--aucto-border-dark)"
          aria-expanded="false"
          aria-label="Toggle menu"
        >
          <i class="fa-solid fa-bars text-white text-base" aria-hidden="true"></i>
        </button>
      `
      }
    </div>
  `;
}

function renderMobileMenu(isUserLoggedIn: boolean, user: User | null): string {
  return `
    <!-- MOBILE MENU DRAWER (hidden = display:none so it stays out of layout) -->
    <div
      id="mobile-menu-overlay"
      class="hidden fixed inset-0 bg-slate-900/50 z-40"
    ></div>

    <aside
      id="mobile-menu-drawer"
      class="hidden fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white z-50 overflow-y-auto"
      style="border-left: 3px solid var(--aucto-border-dark)"
      role="dialog"
      aria-label="Mobile menu"
      aria-modal="true"
    >
      ${
        isUserLoggedIn && user
          ? `
      <!-- Mobile Menu Header - Logged In -->
      <div class="flex items-center justify-between p-4" style="border-bottom: 2px solid var(--aucto-border-light)">
        <div class="flex items-center gap-2">
          ${renderAvatar({
            url: user.avatar?.url,
            name: user.name,
            sizeClass: 'h-10 w-10',
            textClass: '',
            borderStyle: 'border: 2px solid var(--aucto-border-dark)',
          })}
          <div>
            <div class="text-sm font-bold text-slate-900">${escapeHtml(user.name)}</div>
            <div id="navbar-menu-credits" class="text-xs text-slate-600" aria-label="${new Intl.NumberFormat('en-US').format(user.credits || 0)} credits">${new Intl.NumberFormat('en-US').format(user.credits || 0)} credits</div>
          </div>
        </div>
        <button
          id="mobile-menu-close"
          type="button"
          class="text-slate-600 hover:text-slate-900"
          aria-label="Close menu"
        >
          <i class="fa-solid fa-xmark text-xl" aria-hidden="true"></i>
        </button>
      </div>

      <!-- Mobile Menu Navigation Links -->
      <nav class="p-4" aria-label="Mobile navigation">
        <div class="space-y-1">
          ${renderMobileNavLinks(true)}
        </div>

        <!-- Divider -->
        <div class="my-4" style="border-top: 2px solid var(--aucto-border-light)"></div>

        <!-- Logout -->
        <button id="mobile-logout-btn" class="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded transition-colors" aria-label="Logout">
          <i class="fa-solid fa-sign-out-alt text-base w-5" aria-hidden="true"></i>
          <span>Logout</span>
        </button>
      </nav>
      `
          : `
      <!-- Mobile Menu Header - Guest -->
      <div class="flex items-center justify-between p-4" style="border-bottom: 2px solid var(--aucto-border-light)">
        <div class="flex items-center gap-2">
          <img src="/images/logo_v2.svg" alt="Aucto logo" class="h-8" width="107" height="32" />
        </div>
        <button
          id="mobile-menu-close"
          type="button"
          class="text-slate-600 hover:text-slate-900"
          aria-label="Close menu"
        >
          <i class="fa-solid fa-xmark text-xl" aria-hidden="true"></i>
        </button>
      </div>

      <!-- Mobile Menu Navigation Links -->
      <nav class="p-4" aria-label="Mobile navigation">
        <div class="space-y-1">
          ${renderMobileNavLinks(false)}
        </div>

        <!-- Divider -->
        <div class="my-4" style="border-top: 2px solid var(--aucto-border-light)"></div>

        <!-- Auth Buttons -->
        <div class="space-y-2">
          <a href="/login.html" class="w-full flex items-center justify-center gap-2 bg-white px-4 py-3 text-sm font-bold tracking-wide text-slate-900 hover:bg-slate-50" style="border: 2px solid var(--aucto-border-dark)" aria-label="Log in to your account">
            <i class="fa-solid fa-right-to-bracket text-sm" aria-hidden="true"></i>
            <span>Log in</span>
          </a>
          <a href="/register.html" class="w-full flex items-center justify-center gap-2 bg-slate-900 px-4 py-3 text-sm font-bold tracking-wide text-white hover:bg-slate-800" style="border: 2px solid var(--aucto-border-dark)" aria-label="Create new account">
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
 * Close the desktop profile dropdown.
 *
 * The elements are looked up on every call rather than captured, because `renderHeader()`
 * replaces the whole of `#header`
 */
function closeProfileMenu(returnFocus: boolean): void {
  const btn = document.getElementById('profile-menu-btn');
  const menu = document.getElementById('profile-dropdown-menu');
  if (!btn || !menu || menu.classList.contains('hidden')) return;

  menu.classList.add('hidden');
  btn.setAttribute('aria-expanded', 'false');
  document
    .getElementById('profile-menu-chevron')
    ?.classList.remove('rotate-180');

  // Only on Escape. Doing it on an outside click would steal focus from whatever was clicked.
  if (returnFocus) btn.focus();
}

// Document-level listeners are bound for the page's lifetime, not per render.
//  ProfilePage calls renderHeader() again after a profile save, and binding these inside the init functions leaked one of each per call.
let profileMenuDocumentEventsBound = false;
let clearFiltersEventBound = false;

function bindProfileMenuDocumentEvents(): void {
  if (profileMenuDocumentEventsBound) return;
  profileMenuDocumentEventsBound = true;

  document.addEventListener('click', () => closeProfileMenu(false));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeProfileMenu(true);
  });
}

function initHeaderEvents(pageType: string): void {
  // Mobile menu drawer
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenuDrawer = document.getElementById('mobile-menu-drawer');
  const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
  const mobileMenuClose = document.getElementById('mobile-menu-close');

  let releaseDrawerTrap: (() => void) | null = null;

  function openMobileMenu() {
    if (mobileMenuDrawer && mobileMenuOverlay && mobileMenuBtn) {
      mobileMenuDrawer.classList.remove('hidden');
      mobileMenuOverlay.classList.remove('hidden');
      mobileMenuBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      // The drawer carries aria-modal="true";
      //  without this the page behind stays tabbable and that claim is a lie.
      releaseDrawerTrap = trapFocus(mobileMenuDrawer, {
        initialFocus: mobileMenuClose,
        onClose: () => closeMobileMenu(),
      });
    }
  }

  function closeMobileMenu() {
    if (mobileMenuDrawer && mobileMenuOverlay && mobileMenuBtn) {
      mobileMenuDrawer.classList.add('hidden');
      mobileMenuOverlay.classList.add('hidden');
      mobileMenuBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      releaseDrawerTrap?.();
      releaseDrawerTrap = null;
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

    // Closes on an outside click and on Escape; bound once, outside this function.
    bindProfileMenuDocumentEvents();
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
 * Whether `path` is a page that holds a catalog listener, so a search term can be applied in place instead of navigating.
 *
 * Home is served from both `/` and `/index.html`; matching only one of them strands the search.
 * Takes the path rather than reading `location` so it can be tested without a stubbed browser.
 */
export function isBrowsePage(path: string): boolean {
  return (
    path === '/' ||
    path.endsWith('/index.html') ||
    path.endsWith('/collection.html')
  );
}

/**
 * A page with a catalog filters in place; anywhere else the term travels to the home catalog as `?q=`, which `Home.ts` reads on load.
 */
function submitSearch(searchTerm: string): void {
  if (isBrowsePage(window.location.pathname)) {
    document.dispatchEvent(
      new CustomEvent('globalSearchInput', { detail: { query: searchTerm } })
    );
    return;
  }

  if (searchTerm) {
    window.location.href = `/index.html?q=${encodeURIComponent(searchTerm)}`;
  }
}

// Search + filter events, only used on browse pages
function initBrowsePageEvents(): void {
  // Get filter elements
  const filtersBar = document.getElementById('advanced-filters-bar');
  const mobileToggleFilters = document.getElementById('mobile-toggle-filters');
  const mobileFiltersChevron = document.getElementById(
    'mobile-filters-chevron'
  );

  // Mobile search toggle
  const mobileSearchBtn = document.getElementById('mobile-search-btn');
  const mobileSearchBar = document.getElementById('mobile-search-bar');

  if (mobileSearchBtn && mobileSearchBar) {
    mobileSearchBtn.addEventListener('click', () => {
      mobileSearchBar.classList.toggle('hidden');
      const isExpanded = !mobileSearchBar.classList.contains('hidden');
      mobileSearchBtn.setAttribute('aria-expanded', String(isExpanded));

      // Close filters when closing search bar
      if (
        !isExpanded &&
        filtersBar &&
        !filtersBar.classList.contains('hidden')
      ) {
        filtersBar.classList.add('hidden');
        if (mobileToggleFilters) {
          mobileToggleFilters.setAttribute('aria-expanded', 'false');
        }
        if (mobileFiltersChevron) {
          mobileFiltersChevron.classList.remove('rotate-180');
        }
      }

      if (isExpanded) {
        const mobileSearchInput = document.getElementById(
          'mobile-search-input'
        ) as HTMLInputElement;
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
      const input = mobileSearchForm.querySelector(
        'input[name="q"]'
      ) as HTMLInputElement;
      submitSearch(input.value.trim());
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
  const globalSearchInput = document.getElementById(
    'global-search-input'
  ) as HTMLInputElement;

  if (headerSearchForm) {
    headerSearchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = headerSearchForm.querySelector(
        'input[name="q"]'
      ) as HTMLInputElement;
      submitSearch(input.value.trim());
    });
  }

  // Real-time search input for instant filtering
  if (globalSearchInput) {
    let searchTimeout: ReturnType<typeof setTimeout>;
    globalSearchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const searchTerm = globalSearchInput.value.trim();
        document.dispatchEvent(
          new CustomEvent('globalSearchInput', {
            detail: { query: searchTerm },
          })
        );
      }, 300); // Debounce
    });
  }

  // Initialize active-only checkbox using component
  initActiveOnlyCheckbox('active-only-filter');

  // Initialize sort dropdown using component
  initSortDropdown('sort-filter-select');

  // A page clearing its filters resets this bar back to its defaults.
  // These setters only touch the UI, so they cannot loop back into the page.
  // Bound once, and the input is resolved inside the handler:
  //  a re-render replaces it, so the one captured above would be detached by the time this fires.
  if (!clearFiltersEventBound) {
    clearFiltersEventBound = true;

    document.addEventListener('clearAllFilters', () => {
      setActiveCategory('data-filter', 'all');
      setActiveOnlyState('active-only-filter', false);
      setSortValue('sort-filter-select', 'created', 'desc');

      const searchInput = document.getElementById(
        'global-search-input'
      ) as HTMLInputElement | null;
      if (searchInput) {
        searchInput.value = '';
      }
    });
  }
}
