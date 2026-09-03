import { isLoggedIn } from '../utils/auth';
import { renderNewsletter, initNewsletter } from './Newsletter';
import { initFeaturedWin } from './FeaturedWin';
import { initStatsBar } from './StatsBar';

/**
 * Render the footer component
 */
/*
 * The four brand marks, inlined rather than drawn from Font Awesome's brands webfont.
 * That file is 118 kB and these are the only four glyphs in the app that use it, so it was the largest single resource on every page and the one Lighthouse blamed for 1,670 ms of blocked text.
 * Paths are Font Awesome Free 6.5.1, CC BY 4.0 (https://fontawesome.com/license/free).
 */
const SOCIAL_ICONS = {
  twitter: {
    viewBox: '0 0 512 512',
    path: 'M459.37 151.716c.325 4.548.325 9.097.325 13.645 0 138.72-105.583 298.558-298.558 298.558-59.452 0-114.68-17.219-161.137-47.106 8.447.974 16.568 1.299 25.34 1.299 49.055 0 94.213-16.568 130.274-44.832-46.132-.975-84.792-31.188-98.112-72.772 6.498.974 12.995 1.624 19.818 1.624 9.421 0 18.843-1.3 27.614-3.573-48.081-9.747-84.143-51.98-84.143-102.985v-1.299c13.969 7.797 30.214 12.67 47.431 13.319-28.264-18.843-46.781-51.005-46.781-87.391 0-19.492 5.197-37.36 14.294-52.954 51.655 63.675 129.3 105.258 216.365 109.807-1.624-7.797-2.599-15.918-2.599-24.04 0-57.828 46.782-104.934 104.934-104.934 30.213 0 57.502 12.67 76.67 33.137 23.715-4.548 46.456-13.32 66.599-25.34-7.798 24.366-24.366 44.833-46.132 57.827 21.117-2.273 41.584-8.122 60.426-16.243-14.292 20.791-32.161 39.308-52.628 54.253z',
  },
  instagram: {
    viewBox: '0 0 448 512',
    path: 'M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z',
  },
  linkedin: {
    viewBox: '0 0 448 512',
    path: 'M416 32H31.9C14.3 32 0 46.5 0 64.3v383.4C0 465.5 14.3 480 31.9 480H416c17.6 0 32-14.5 32-32.3V64.3c0-17.8-14.4-32.3-32-32.3zM135.4 416H69V202.2h66.5V416zm-33.2-243c-21.3 0-38.5-17.3-38.5-38.5S80.9 96 102.2 96c21.2 0 38.5 17.3 38.5 38.5 0 21.3-17.2 38.5-38.5 38.5zm282.1 243h-66.4V312c0-24.8-.5-56.7-34.5-56.7-34.6 0-39.9 27-39.9 54.9V416h-66.4V202.2h63.7v29.2h.9c8.9-16.8 30.6-34.5 62.9-34.5 67.2 0 79.7 44.3 79.7 101.9V416z',
  },
  facebook: {
    viewBox: '0 0 512 512',
    path: 'M512 256C512 114.6 397.4 0 256 0S0 114.6 0 256C0 376 82.7 476.8 194.2 504.5V334.2H141.4V256h52.8V222.3c0-87.1 39.4-127.5 125-127.5c16.2 0 44.2 3.2 55.7 6.4V172c-6-.6-16.5-1-29.6-1c-42 0-58.2 15.9-58.2 57.2V256h83.6l-14.4 78.2H287V510.1C413.8 494.8 512 386.9 512 256h0z',
  },
} as const;

function renderSocialLink(
  icon: keyof typeof SOCIAL_ICONS,
  label: string
): string {
  const { viewBox, path } = SOCIAL_ICONS[icon];

  return `
          <a
            class="flex h-10 w-10 items-center justify-center bg-slate-800 text-white transition-colors hover:bg-slate-700"
            style="border: 2px solid #475569"
            title="Follow us on ${label}"
          >
            <svg
              class="h-3.5 w-auto"
              viewBox="${viewBox}"
              fill="currentColor"
              aria-hidden="true"
              focusable="false"
            >
              <path d="${path}" />
            </svg>
          </a>`;
}

export function renderFooter(): void {
  const footer = document.getElementById('footer');
  if (!footer) return;

  const isUserLoggedIn = isLoggedIn();

  footer.innerHTML = `
    <footer class="bg-slate-900 px-6 md:px-8 pb-12 pt-20 text-slate-400">
  <div class="mx-auto max-w-7xl">

    ${
      isUserLoggedIn
        ? `
      <!-- Featured Win - Logged In Users Only -->
      <div id="featured-win-container"></div>

      <!-- Stats Bar - Logged In Users Only -->
      <div id="stats-bar-container"></div>
    `
        : `
      <!-- Newsletter - Guest Users Only -->
      ${renderNewsletter()}
    `
    }
    <!-- Main Footer Navigation -->
    <div class="mb-16 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
      <!-- Brand -->
      <div>
        <a href="/index.html" class="mb-6 inline-block">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 bg-white flex items-center justify-center" style="border: 2px solid #475569">
              <svg class="h-7 w-7" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Aucto icon">
                <path d="M34 96 L64 28 L94 96 L82 96 L82 76 L46 76 L46 96 Z" fill="#1e293b"/>
                <rect x="46" y="60" width="36" height="10" fill="#f1f5f9"/>
              </svg>
            </div>
            <span class="text-3xl font-bold text-white">AUCTO</span>
          </div>
        </a>
        <p class="mb-6 text-sm leading-relaxed text-slate-400">
          Professional auction infrastructure for serious collectors.
        </p>
        <div class="flex items-center gap-3">
          <div class="h-2 w-2 bg-green-500"></div>
          <span class="text-xs text-slate-400">24/7 Support Active</span>
        </div>
      </div>

      <!-- Platform -->
      <div>
        <h3
          class="mb-6 text-xs font-bold tracking-widest text-slate-400 uppercase"
        >
          Platform
        </h3>
        <ul class="space-y-3 text-sm">
          <li>
            <a
              href="/collection.html"
              class="transition-colors hover:text-white inline-flex items-center gap-2"
            >
              <i class="fa-solid fa-list text-xs text-slate-500" aria-hidden="true"></i>Browse
              Catalog
            </a>
          </li>
          <li>
            <a
              href="/collection.html"
              class="transition-colors hover:text-white inline-flex items-center gap-2"
            >
              <i class="fa-solid fa-tower-broadcast text-xs text-slate-500" aria-hidden="true"></i
              >Live Auctions
            </a>
          </li>
          <li>
            <a
              href="${isUserLoggedIn ? '/listing-create.html' : '/login.html?redirect=/listing-create.html'}"
              id="footer-sell-item-link"
              class="transition-colors hover:text-white inline-flex items-center gap-2"
            >
              <i class="fa-solid fa-plus text-xs text-slate-500" aria-hidden="true"></i>Sell an
              Item
            </a>
          </li>
          <li>
            <a
              href="${isUserLoggedIn ? '/profile.html' : '/login.html?redirect=/profile.html'}"
              id="footer-my-account-link"
              class="transition-colors hover:text-white inline-flex items-center gap-2"
            >
              <i class="fa-solid fa-user text-xs text-slate-500" aria-hidden="true"></i>My Account
            </a>
          </li>
        </ul>
      </div>

      <!-- Resources -->
      <div>
        <h3
          class="mb-6 text-xs font-bold tracking-widest text-slate-400 uppercase"
        >
          Resources
        </h3>
        <ul class="space-y-3 text-sm">
          <li>
            <a
              class="transition-colors hover:text-white inline-flex items-center gap-2"
            >
              <i class="fa-solid fa-circle-question text-xs text-slate-500" aria-hidden="true"></i
              >How Bidding Works
            </a>
          </li>
          <li>
            <a
              class="transition-colors hover:text-white inline-flex items-center gap-2"
            >
              <i class="fa-solid fa-book text-xs text-slate-500" aria-hidden="true"></i>Seller's
              Guide
            </a>
          </li>
          <li>
            <a
              class="transition-colors hover:text-white inline-flex items-center gap-2"
            >
              <i class="fa-solid fa-shield text-xs text-slate-500" aria-hidden="true"></i
              >Authentication
            </a>
          </li>
          <li>
            <a
              class="transition-colors hover:text-white inline-flex items-center gap-2"
            >
              <i class="fa-solid fa-headset text-xs text-slate-500" aria-hidden="true"></i>Help
              Center
            </a>
          </li>
        </ul>
      </div>

      <!-- Legal + Contact -->
      <div>
        <h3
          class="mb-6 text-xs font-bold tracking-widest text-slate-400 uppercase"
        >
          Legal
        </h3>
        <ul class="space-y-3 text-sm mb-6">
          <li>
            <a
              class="transition-colors hover:text-white inline-flex items-center gap-2"
            >
              <i class="fa-solid fa-file-contract text-xs text-slate-500" aria-hidden="true"></i
              >Terms of Service
            </a>
          </li>
          <li>
            <a
              class="transition-colors hover:text-white inline-flex items-center gap-2"
            >
              <i class="fa-solid fa-lock text-xs text-slate-500" aria-hidden="true"></i>Privacy
              Policy
            </a>
          </li>
          <li>
            <a
              class="transition-colors hover:text-white inline-flex items-center gap-2"
            >
              <i class="fa-solid fa-cookie text-xs text-slate-500" aria-hidden="true"></i>Cookie
              Policy
            </a>
          </li>
        </ul>

        <div class="mb-4">
          <div
            class="mb-2 text-xs font-bold tracking-widest text-slate-400 uppercase"
          >
            Contact
          </div>
          <a
            href="mailto:support@aucto.app"
            class="block text-white transition-colors hover:text-slate-300"
          >
            support@aucto.app
          </a>
          <a
            href="tel:+4712345678"
            class="block text-white transition-colors hover:text-slate-300"
          >
            +47 123 45 678
          </a>
          <div class="text-slate-400">Available 24/7</div>
        </div>

        <div
          class="mb-4 text-xs font-bold tracking-widest text-slate-400 uppercase"
        >
          Follow
        </div>
        <div class="flex gap-3">${renderSocialLink('twitter', 'Twitter')}${renderSocialLink(
          'instagram',
          'Instagram'
        )}${renderSocialLink('linkedin', 'LinkedIn')}${renderSocialLink(
          'facebook',
          'Facebook'
        )}
        </div>
      </div>
    </div>

    <!-- Bottom Bar -->
    <div
      class="flex flex-col items-center justify-between gap-8 pt-12 md:flex-row"
      style="border-top: 2px solid var(--aucto-border-mid)"
    >
      <div class="text-sm text-slate-400">
        &copy; 2025 Aucto. All rights reserved.
      </div>
      <div
        class="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400"
      >
        <span class="hidden sm:inline"
          >Built for Noroff Front-End Development</span
        >
        <span class="hidden sm:inline">•</span>
        <span>Oslo, Norway</span>
        <span>•</span>
        <a class="transition-colors hover:text-slate-300"
          >Student Project</a
        >
      </div>
    </div>
  </div>
</footer>
  `;

  // Initialize dynamic components based on user state
  setTimeout(() => {
    if (isUserLoggedIn) {
      // Initialize featured win and stats bar with real data for logged-in users
      initFeaturedWin();
      initStatsBar();
    } else {
      // Initialize newsletter functionality for guest users
      initNewsletter();
    }
  }, 0);
}
