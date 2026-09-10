import { invalidateProfileCache } from '../utils/profileCache';
import { prefersReducedMotion } from '../utils/motion';
import { highestBid } from '../utils/biddingStats';
import { renderHeader } from '../components/Navbar';
import { renderFooter } from '../components/Footer';
import { getCurrentUser, protectedRoute } from '../utils/auth';
import {
  getProfile,
  getProfileBids,
  getProfileWins,
  updateProfile,
} from '../api/profile';
import { profileListings } from '../api/listingQueries';
import type { CatalogResult } from '../api/listingQueries';
import type { Profile, Listing, Bid, UpdateProfileData } from '../types/api';
import {
  formatTimeAgo,
  formatTimeRemaining,
  isAuctionActive,
} from '../utils/formatDate';
import { isValidUrl } from '../utils/validation';
import { showToast } from '../components/Toast';
import { setUser } from '../utils/storage';
import { logError } from '../utils/logger';
import { getErrorMessage } from '../utils/errorHandling';
import { escapeHtml } from '../utils/escapeHtml';
import { formatCredits, formatCurrency } from '../utils/formatCurrency';
import {
  initIdentityFallbacks,
  initLotImageFallbacks,
  lotImageSource,
} from '../utils/listingImage';
import { renderAvatar } from '../components/Avatar';
import { renderPagination } from '../components/PaginationComponent';
import { mountErrorPanel } from '../components/ErrorPanel';
import { generateResponsiveImageAttrs } from '../utils/imageOptimization';

const LISTINGS_PER_PAGE = 6;

let listingsRequestId = 0;

export function initProfilePage(): void {
  // Render header and footer
  renderHeader();
  renderFooter();

  // Get username from URL parameter (e.g., profile.html?user=johndoe)
  const urlParams = new URLSearchParams(window.location.search);
  const username = urlParams.get('user');

  // If no username in URL, show current user's profile (requires login)
  if (!username) {
    // Check authentication and redirect to login if not authenticated
    if (!protectedRoute()) {
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // Update page title and description for own profile
    updatePageHeader('My Profile', 'Manage your account, listings, and bids');

    // Load current user's profile data
    loadProfileData(currentUser.name, true);
  } else {
    // Viewing another user's profile. Not public, whatever this used to say: every
    // /auction/profiles/* route is 401 without a bearer token (measured 2026-09-10), so a
    // logged-out visitor following a seller link lands on the session-expired path instead.

    const currentUser = getCurrentUser();
    const isOwnProfile = currentUser?.name === username;

    // Update page title and description
    if (isOwnProfile) {
      updatePageHeader('My Profile', 'Manage your account, listings, and bids');
    } else {
      updatePageHeader(
        `${username}'s Profile`,
        `View ${username}'s listings, bids, and auction activity`
      );
    }

    // Load the specified user's profile
    loadProfileData(username, isOwnProfile);
  }
}

function updatePageHeader(title: string, description: string): void {
  const titleElement = document.getElementById('page-title');
  const descElement = document.getElementById('page-description');

  if (titleElement) {
    titleElement.textContent = title;
  }

  if (descElement) {
    descElement.textContent = description;
  }
}

async function loadProfileData(
  username: string,
  isOwnProfile: boolean
): Promise<void> {
  const container = document.getElementById('profile-content');
  if (!container) return;

  // Show loading state
  container.innerHTML = `
    <div class="flex items-center justify-center py-20">
      <div class="text-center">
        <i class="fa-solid fa-spinner fa-spin text-4xl text-slate-400 mb-4" aria-hidden="true"></i>
        <p class="text-slate-600">Loading profile...</p>
      </div>
    </div>
  `;

  try {
    // Fetch profile data
    const [profileResponse, listingsResult, bidsResponse, winsResponse] =
      await Promise.all([
        getProfile(username),
        profileListings(username, 1, LISTINGS_PER_PAGE),
        getProfileBids(username),
        getProfileWins(username),
      ]);

    const profile = profileResponse.data;
    const bids = bidsResponse.data;
    const wins = winsResponse.data;

    // Render profile
    renderProfile(profile, listingsResult, bids, wins, isOwnProfile);
  } catch (error) {
    logError('Failed to load profile data', error);
    showError('Failed to load profile data');
  }
}

function renderProfile(
  profile: Profile,
  listings: CatalogResult,
  bids: Bid[],
  wins: Listing[],
  isOwnProfile: boolean
): void {
  const container = document.getElementById('profile-content');
  if (!container) return;

  const totalBidsPlaced = bids.length;

  container.innerHTML = `
    <div class="space-y-8">
      ${renderProfileHero(profile, listings.totalCount, wins.length, totalBidsPlaced, isOwnProfile)}
      ${renderAboutAndSettings(profile, isOwnProfile)}
      ${renderListingsSection(listings, isOwnProfile, 1)}
      ${renderWinsAndBids(wins, bids, isOwnProfile)}
    </div>
  `;

  initLotImageFallbacks(container);
  initIdentityFallbacks(container);
  mountListingsPagination(profile.name, isOwnProfile, listings, 1);

  // Add event listeners (only if own profile)
  if (isOwnProfile) {
    setupEventListeners(profile);
  }
}

function renderProfileHero(
  profile: Profile,
  listingsCount: number,
  winsCount: number,
  bidsCount: number,
  isOwnProfile: boolean
): string {
  const avatarUrl = profile.avatar?.url || '';
  const bannerUrl = profile.banner?.url || '';
  const credits = profile.credits || 0;

  return `
    <section class="space-y-6">
      <!-- Breadcrumbs -->
      <nav aria-label="Breadcrumb">
        <ol class="flex items-center text-xs font-bold tracking-[0.18em] uppercase">
          <li>
            <a href="/index.html" class="text-slate-600 hover:text-slate-900">Home</a>
          </li>
          <li class="mx-2 text-slate-400">/</li>
          <li>
            <span class="text-slate-900">Profile</span>
          </li>
        </ol>
      </nav>

      <!-- Main hero card -->
      <div class="bg-white relative" style="border: 3px solid var(--aucto-border-dark)">
        <!-- Banner -->
        <div
          class="relative h-40 md:h-48 bg-slate-200"
          style="border-bottom: 3px solid var(--aucto-border-dark); min-height: 10rem;"
        >
          ${
            bannerUrl
              ? `<img
              src="${escapeHtml(bannerUrl)}"
              alt="Profile banner"
              class="h-full w-full object-cover"
              width="1200"
              height="192"
              fetchpriority="high"
              decoding="async"
              referrerpolicy="no-referrer"
              data-identity-image
            />`
              : ''
          }
        </div>

        <!-- Content row with avatar, info, and buttons -->
        <div class="px-6 md:px-10 py-8 flex flex-col md:flex-row gap-6 items-start md:items-center">
          <!-- Avatar -->
          <div
            class="w-28 h-28 flex-shrink-0 bg-white"
            style="border: 3px solid var(--aucto-border-dark);"
          >
            ${renderAvatar({
              url: avatarUrl || undefined,
              name: profile.name,
              sizeClass: 'h-full w-full',
              textClass: 'text-4xl',
              alt: 'Profile avatar',
              loading: 'eager',
            })}
          </div>

          <!-- Info section -->
          <div class="w-full min-w-0 flex-1">
            <div
              class="mb-1 inline-flex max-w-full items-center gap-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500"
            >
              <i class="fa-solid fa-user text-xs" aria-hidden="true"></i>
              <span class="break-all">@${escapeHtml(profile.name)}</span>
            </div>
            <div class="flex flex-wrap items-center gap-4">
              <h2
                class="min-w-0 break-all text-3xl font-bold leading-tight text-slate-900 md:text-4xl"
              >
                ${escapeHtml(profile.name)}
              </h2>
            </div>
            ${
              isOwnProfile
                ? `<div class="mt-1 inline-flex max-w-full items-center gap-2 text-sm text-slate-600">
              <i class="fa-solid fa-envelope text-sm" aria-hidden="true"></i>
              <span class="break-all">${escapeHtml(profile.email)}</span>
            </div>`
                : ''
            }
            ${
              profile.bio
                ? `<p class="mt-3 max-w-2xl break-words text-sm leading-relaxed text-slate-600">
              ${escapeHtml(profile.bio)}
            </p>`
                : ''
            }
          </div>

          <!-- Buttons (only show for own profile) -->
          ${
            isOwnProfile
              ? `<div class="flex flex-col gap-3">
            <button
              id="edit-profile-btn"
              class="bg-slate-900 px-6 py-3 text-xs font-bold tracking-wide text-white hover:bg-slate-800 inline-flex items-center gap-2"
              style="border: 2px solid var(--aucto-border-dark)"
            >
              <i class="fa-solid fa-pen-to-square text-sm" aria-hidden="true"></i>
              <span>Edit profile</span>
            </button>
            <a
              href="/listing-create.html"
              class="bg-white px-6 py-3 text-xs font-bold tracking-wide text-slate-900 hover:bg-slate-50 inline-flex items-center gap-2 justify-center"
              style="border: 2px solid var(--aucto-border-mid)"
            >
              <i class="fa-solid fa-plus text-sm" aria-hidden="true"></i>
              <span>Create listing</span>
            </a>
          </div>`
              : ''
          }
        </div>
      </div>

      <!-- Stats bar -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          class="bg-white px-6 py-5 text-center"
          style="border: 3px solid var(--aucto-border-dark)"
        >
          <div
            class="mb-1 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500 inline-flex items-center justify-center gap-1"
          >
            <i class="fa-solid fa-coins text-xs" aria-hidden="true"></i>
            <span>Credits available</span>
          </div>
          <div class="text-3xl font-bold text-slate-900">${formatCredits(credits)}</div>
        </div>
        <div
          class="bg-white px-6 py-5 text-center"
          style="border: 3px solid var(--aucto-border-dark)"
        >
          <div
            class="mb-1 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500 inline-flex items-center justify-center gap-1"
          >
            <i class="fa-solid fa-box text-xs" aria-hidden="true"></i>
            <span>Listings</span>
          </div>
          <div class="text-3xl font-bold text-slate-900">${listingsCount}</div>
        </div>
        <div
          class="bg-white px-6 py-5 text-center"
          style="border: 3px solid var(--aucto-border-dark)"
        >
          <div
            class="mb-1 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500 inline-flex items-center justify-center gap-1"
          >
            <i class="fa-solid fa-trophy text-xs text-amber-600" aria-hidden="true"></i>
            <span>Auctions won</span>
          </div>
          <div class="text-3xl font-bold text-slate-900">${winsCount}</div>
        </div>
        <div
          class="bg-white px-6 py-5 text-center"
          style="border: 3px solid var(--aucto-border-dark)"
        >
          <div
            class="mb-1 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500 inline-flex items-center justify-center gap-1"
          >
            <i class="fa-solid fa-gavel text-xs" aria-hidden="true"></i>
            <span>Bids placed</span>
          </div>
          <div class="text-3xl font-bold text-slate-900">${bidsCount}</div>
        </div>
      </div>
    </section>
  `;
}

function renderAboutAndSettings(
  profile: Profile,
  isOwnProfile: boolean
): string {
  return `
    <section>
      <div class="grid grid-cols-1 gap-6 ${isOwnProfile ? 'lg:grid-cols-2' : ''}">
        <!-- About card -->
        <div class="bg-white p-8 md:p-10" style="border: 3px solid var(--aucto-border-dark)">
          <h2 class="mb-4 text-3xl font-bold text-slate-900">
            About this seller
          </h2>
          <p class="mb-4 break-words text-sm leading-relaxed text-slate-600">
            ${escapeHtml(profile.bio || 'No bio provided yet.')}
          </p>
          <div class="mt-6 grid grid-cols-1 gap-4 text-sm text-slate-600 sm:grid-cols-2">
            ${
              isOwnProfile
                ? `<div>
              <div
                class="text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500"
              >
                Email
              </div>
              <div class="break-all">${escapeHtml(profile.email)}</div>
            </div>`
                : ''
            }
            <div>
              <div
                class="text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500"
              >
                Username
              </div>
              <div class="break-all">@${escapeHtml(profile.name)}</div>
            </div>
            <div>
              <div
                class="text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500"
              >
                Total listings
              </div>
              <div>${profile._count?.listings || 0} total</div>
            </div>
            <div>
              <div
                class="text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500"
              >
                Total wins
              </div>
              <div>${profile._count?.wins || 0} auctions won</div>
            </div>
          </div>
        </div>

        <!-- Settings card (only show for own profile) -->
        ${
          isOwnProfile
            ? `<div class="bg-white p-8 md:p-10" style="border: 3px solid var(--aucto-border-dark)">
          <h2 class="mb-4 text-2xl font-bold text-slate-900">
            Profile settings
          </h2>
          <p class="mb-6 text-sm text-slate-600">
            Update your profile information
          </p>

          <form id="profile-form" class="space-y-4 text-sm">
            <div>
              <label
                class="mb-1 block text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500"
              >
                Bio
              </label>
              <textarea
                id="bio-input"
                class="w-full bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline focus:outline-[3px] focus:outline-aucto-red focus:outline-offset-2"
                style="border: 2px solid var(--aucto-border-mid)"
                rows="3"
                placeholder="Short description about yourself"
              >${escapeHtml(profile.bio || '')}</textarea>
            </div>

            <div>
              <label
                class="mb-1 block text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500"
              >
                Avatar image URL
              </label>
              <input
                id="avatar-input"
                type="url"
                class="w-full bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline focus:outline-[3px] focus:outline-aucto-red focus:outline-offset-2"
                style="border: 2px solid var(--aucto-border-mid)"
                placeholder="https://url.com/avatar.jpg"
                value="${escapeHtml(profile.avatar?.url || '')}"
              />
            </div>

            <div>
              <label
                class="mb-1 block text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500"
              >
                Banner image URL
              </label>
              <input
                id="banner-input"
                type="url"
                class="w-full bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline focus:outline-[3px] focus:outline-aucto-red focus:outline-offset-2"
                style="border: 2px solid var(--aucto-border-mid)"
                placeholder="https://url.com/banner.jpg"
                value="${escapeHtml(profile.banner?.url || '')}"
              />
            </div>

            <button
              type="submit"
              class="mt-4 w-full bg-slate-900 py-3 text-xs font-bold tracking-wide text-white hover:bg-slate-800 inline-flex items-center justify-center gap-2"
              style="border: 2px solid var(--aucto-border-dark)"
            >
              <i class="fa-solid fa-floppy-disk text-base" aria-hidden="true"></i>
              <span>Save profile changes</span>
            </button>
          </form>
        </div>`
            : ''
        }
      </div>
    </section>
  `;
}

function renderListingsSection(
  result: CatalogResult,
  isOwnProfile: boolean,
  page: number
): string {
  return `
    <section id="profile-listings">
      ${renderListingsPanel(result, isOwnProfile, page)}
    </section>
  `;
}

function renderListingsPanel(
  result: CatalogResult,
  isOwnProfile: boolean,
  page: number
): string {
  const isEmpty = result.listings.length === 0;
  const start = (page - 1) * LISTINGS_PER_PAGE + 1;
  const end = start + result.listings.length - 1;
  const noun = result.totalCount === 1 ? 'listing' : 'listings';

  const subtitle = isEmpty
    ? isOwnProfile
      ? "You don't have any listings yet"
      : 'This seller has no listings'
    : `Showing ${start}-${end} of ${result.totalCount} ${noun}`;

  const body = isEmpty
    ? `<div class="text-center py-12">
            <i class="fa-solid fa-box text-6xl text-slate-300 mb-4" aria-hidden="true"></i>
            <p class="text-slate-600">${isOwnProfile ? 'Start by creating your first listing' : 'No listings to display'}</p>
          </div>`
    : `<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            ${result.listings.map((listing) => renderListingCard(listing, isOwnProfile)).join('')}
          </div>`;

  return `
      <div class="bg-white p-8 md:p-10" style="border: 3px solid var(--aucto-border-dark)">
        <div class="mb-6 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h2 class="text-3xl font-bold text-slate-900">Listings</h2>
            <p class="mt-1 text-sm text-slate-600">${subtitle}</p>
          </div>
          ${
            isOwnProfile
              ? `<a
            href="/listing-create.html"
            class="inline-flex items-center gap-2 bg-slate-900 px-6 py-3 text-xs font-bold tracking-wide text-white hover:bg-slate-800"
            style="border: 2px solid var(--aucto-border-dark)"
          >
            <i class="fa-solid fa-plus text-sm" aria-hidden="true"></i>
            <span>Create listing</span>
          </a>`
              : ''
          }
        </div>
        ${body}
        <div id="profile-listings-pagination" class="mt-8 empty:hidden"></div>
      </div>
  `;
}

function mountListingsPagination(
  username: string,
  isOwnProfile: boolean,
  result: CatalogResult,
  page: number
): void {
  renderPagination({
    containerId: 'profile-listings-pagination',
    currentPage: page,
    totalPages: result.pageCount,
    onPageChange: (next: number) => {
      void goToListingsPage(username, isOwnProfile, next);
    },
  });
}

/** Repaint the listings panel alone — the hero, wins and bids do not change with the page. */
async function goToListingsPage(
  username: string,
  isOwnProfile: boolean,
  page: number
): Promise<void> {
  const section = document.getElementById('profile-listings');
  if (!section) return;

  const requestId = ++listingsRequestId;

  try {
    const result = await profileListings(username, page, LISTINGS_PER_PAGE);

    // A newer page was asked for while this one was in flight.
    if (requestId !== listingsRequestId) return;

    section.innerHTML = renderListingsPanel(result, isOwnProfile, page);
    initLotImageFallbacks(section);
    mountListingsPagination(username, isOwnProfile, result, page);

    // The repaint destroys the button that was focused, which would otherwise drop focus to <body>.
    const heading = section.querySelector<HTMLElement>('h2');
    if (heading) {
      heading.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      });
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  } catch (error) {
    if (requestId !== listingsRequestId) return;

    logError('Failed to load profile listings page', error);
    showToast('Could not load that page of listings', 'error');
  }
}

function renderListingCard(listing: Listing, isOwnProfile: boolean): string {
  const image = lotImageSource(listing.media, listing.title);
  // Through the shared preset, not hand-written attributes: without it this grid emitted no
  //  srcset or sizes, so every CDN-hosted lot downloaded its original into a 600px box.
  const imgAttrs = generateResponsiveImageAttrs(image.src, image.alt, 'square');
  const bidsCount = listing._count?.bids || 0;
  const currentHighest = highestBid(listing.bids);
  const tag = listing.tags?.[0] || 'General';
  const timeRemaining = formatTimeRemaining(listing.endsAt);
  const isActive = isAuctionActive(listing.endsAt);

  return `
    <article
      class="bg-white transition-all hover:-translate-y-1"
      style="border: 2px solid var(--aucto-border-dark)"
    >
      <div
        class="relative aspect-square bg-slate-100"
        style="border-bottom: 2px solid var(--aucto-border-dark)"
      >
        ${
          isActive
            ? ''
            : `<div class="absolute top-3 left-3 bg-slate-600 px-3 py-1 text-xs font-bold text-white" style="border: 2px solid #475569">
          ENDED
        </div>`
        }
        <img
          src="${escapeHtml(imgAttrs.src)}"
          ${imgAttrs.srcset ? `srcset="${escapeHtml(imgAttrs.srcset)}"` : ''}
          alt="${escapeHtml(imgAttrs.alt)}"
          width="${imgAttrs.width}"
          height="${imgAttrs.height}"
          sizes="${imgAttrs.sizes}"
          loading="${imgAttrs.loading}"
          decoding="${imgAttrs.decoding}"
          class="h-full w-full object-cover"
          referrerpolicy="no-referrer"
          data-lot-image
        />
      </div>
      <div class="p-5">
        <div
          class="mb-2 flex items-center justify-between text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500"
        >
          <span>${escapeHtml(tag)}</span>
          <span>${bidsCount} ${bidsCount === 1 ? 'bid' : 'bids'}</span>
        </div>
        <h3 class="mb-2 text-xl font-bold leading-tight text-slate-900">
          ${escapeHtml(listing.title)}
        </h3>
        <div class="mb-3 text-xs text-slate-600">
          ${isActive ? `Ends ${timeRemaining}` : 'Ended'}
        </div>
        <div class="mb-4 text-2xl font-bold text-slate-900">
          ${currentHighest > 0 ? `${formatCredits(currentHighest)} Credits` : 'No bids yet'}
        </div>
        <div class="flex gap-2">
          <a
            href="/listing.html?id=${listing.id}"
            class="flex-1 bg-slate-900 py-3 text-xs font-bold tracking-wide text-white hover:bg-slate-800 inline-flex items-center justify-center gap-2"
            style="border: 2px solid var(--aucto-border-dark)"
          >
            <i class="fa-solid fa-eye text-sm" aria-hidden="true"></i>
            <span>View</span>
          </a>
          ${
            isOwnProfile
              ? `<a
            href="/listing-edit.html?id=${listing.id}"
            class="bg-white py-3 px-4 text-xs font-bold tracking-wide text-slate-900 hover:bg-slate-50 inline-flex items-center justify-center"
            style="border: 2px solid var(--aucto-border-mid)"
            title="Edit listing"
          >
            <i class="fa-solid fa-pen text-sm" aria-hidden="true"></i>
          </a>`
              : ''
          }
        </div>
      </div>
    </article>
  `;
}

/**
 * Written twice, once for the owner and once for a visitor, like the listings panel above it.
 * It was not, so a stranger's profile read "You have won 2 auctions" about somebody else.
 *
 * The hero's "Credits available" tile is still unguarded — a visitor sees that seller's balance
 * under a label that reads as their own. That one is a decision about what a profile publishes,
 * not a copy fix, so it is not made here.
 */
function renderWinsAndBids(
  wins: Listing[],
  bids: Bid[],
  isOwnProfile: boolean
): string {
  return `
    <section>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- Wins -->
        <div class="bg-white p-8 md:p-10" style="border: 3px solid var(--aucto-border-dark)">
          <h2 class="mb-4 text-2xl font-bold text-slate-900">Recent wins</h2>
          <p class="mb-6 text-sm text-slate-600">
            ${
              wins.length === 0
                ? isOwnProfile
                  ? "You haven't won any auctions yet"
                  : "This seller hasn't won any auctions yet"
                : `${isOwnProfile ? 'You have' : 'This seller has'} won ${wins.length} ${wins.length === 1 ? 'auction' : 'auctions'}`
            }
          </p>
          ${
            wins.length === 0
              ? `<div class="text-center py-8">
              <i class="fa-solid fa-trophy text-6xl text-slate-300 mb-4" aria-hidden="true"></i>
              <p class="text-slate-600">${isOwnProfile ? 'Your won items will appear here' : 'No wins to display'}</p>
            </div>`
              : `<div class="space-y-4 text-sm text-slate-700">
              ${wins
                .slice(0, 5)
                .map((win) => renderWinItem(win))
                .join('')}
            </div>`
          }
        </div>

        <!-- Bids -->
        <div class="bg-white p-8 md:p-10" style="border: 3px solid var(--aucto-border-dark)">
          <h2 class="mb-4 text-2xl font-bold text-slate-900">
            Recent bid activity
          </h2>
          <p class="mb-6 text-sm text-slate-600">
            ${
              bids.length === 0
                ? isOwnProfile
                  ? "You haven't placed any bids yet"
                  : "This seller hasn't placed any bids yet"
                : `${isOwnProfile ? 'You have' : 'This seller has'} placed ${bids.length} ${bids.length === 1 ? 'bid' : 'bids'}`
            }
          </p>
          ${
            bids.length === 0
              ? `<div class="text-center py-8">
              <i class="fa-solid fa-gavel text-6xl text-slate-300 mb-4" aria-hidden="true"></i>
              <p class="text-slate-600">${isOwnProfile ? 'Your bids will appear here' : 'No bid activity to display'}</p>
            </div>`
              : `<div class="space-y-4 text-sm text-slate-700">
              ${bids
                .slice(0, 5)
                .map((bid) => renderBidItem(bid))
                .join('')}
            </div>`
          }
        </div>
      </div>
    </section>
  `;
}

function renderWinItem(win: Listing): string {
  const currentHighest = highestBid(win.bids);
  const timeAgo = formatTimeAgo(win.endsAt);

  return `
    <div class="flex items-start justify-between gap-3">
      <div>
        <a href="/listing.html?id=${win.id}" class="text-sm font-semibold text-slate-900 hover:text-slate-700">
          ${escapeHtml(win.title)}
        </a>
        <div class="text-xs text-slate-500">
          Won for ${formatCurrency(currentHighest)} · ${timeAgo}
        </div>
      </div>
      <div
        class="text-[11px] font-bold tracking-[0.18em] uppercase text-green-700"
      >
        Won
      </div>
    </div>
  `;
}

function renderBidItem(bid: Bid): string {
  const timeAgo = formatTimeAgo(bid.created);

  return `
    <div class="flex items-center justify-between gap-3">
      <div>
        <div class="font-semibold text-slate-900">
          Bid placed
        </div>
        <div class="text-xs text-slate-500">
          ${formatCurrency(bid.amount)} · ${timeAgo}
        </div>
      </div>
    </div>
  `;
}

function setupEventListeners(profile: Profile): void {
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleProfileUpdate(profile.name);
    });
  }

  const editBtn = document.getElementById('edit-profile-btn');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      const settingsSection = document.querySelector('#profile-form');
      if (settingsSection) {
        settingsSection.scrollIntoView({
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'center',
        });
      }
    });
  }
}

async function handleProfileUpdate(username: string): Promise<void> {
  const bioInput = document.getElementById('bio-input') as HTMLTextAreaElement;
  const avatarInput = document.getElementById(
    'avatar-input'
  ) as HTMLInputElement;
  const bannerInput = document.getElementById(
    'banner-input'
  ) as HTMLInputElement;

  if (!bioInput || !avatarInput || !bannerInput) return;

  // Get the submit button to show loading state
  const submitBtn = document.querySelector(
    '#profile-form button[type="submit"]'
  ) as HTMLButtonElement;
  if (!submitBtn) return;

  // Validate URLs if provided
  const avatarUrl = avatarInput.value.trim();
  const bannerUrl = bannerInput.value.trim();

  if (avatarUrl && !isValidUrl(avatarUrl)) {
    showToast('Please enter a valid avatar URL', 'error');
    avatarInput.focus();
    return;
  }

  if (bannerUrl && !isValidUrl(bannerUrl)) {
    showToast('Please enter a valid banner URL', 'error');
    bannerInput.focus();
    return;
  }

  // Build update data - only include fields that have values
  const updateData: UpdateProfileData = {};

  // Always include bio (can be empty string to clear it)
  updateData.bio = bioInput.value.trim();

  // Only include avatar if URL is provided and valid
  if (avatarUrl) {
    updateData.avatar = { url: avatarUrl };
  }

  // Only include banner if URL is provided and valid
  if (bannerUrl) {
    updateData.banner = { url: bannerUrl };
  }

  // Disable button and show loading state
  const originalBtnContent = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin text-base" aria-hidden="true"></i> <span>Saving...</span>';

  try {
    const response = await updateProfile(username, updateData);

    // Update stored user data if this is the current user
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.name === username && response.data) {
      const updatedUser = {
        ...currentUser,
        bio: response.data.bio,
        avatar: response.data.avatar,
        banner: response.data.banner,
      };
      setUser(updatedUser);
      invalidateProfileCache();
    }

    showToast('Profile updated successfully!', 'success');

    // Reload profile and header after a short delay
    setTimeout(async () => {
      await loadProfileData(username, true);
      // Repaints the navbar avatar: setUser() above stored the new one and renderHeader()
      // reads storage, so the avatar itself costs nothing. The credit refresh it kicks off
      // does spend a request, because invalidateProfileCache() above left the cache cold.
      renderHeader();
    }, 1000);
  } catch (error) {
    logError('Failed to update profile', error, { username });
    showToast(getErrorMessage(error, 'Failed to update profile'), 'error');

    // Re-enable button
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnContent;
  }
}

function showError(message: string): void {
  mountErrorPanel(document.getElementById('profile-content'), {
    message,
    action: { label: 'Go to Home', href: '/index.html' },
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfilePage);
} else {
  initProfilePage();
}
