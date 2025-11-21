// src/js/ui/navbar.ts

export type NavbarUser = {
  name: string;
  credits: number;
  avatar: string;
};

/**
 * Optional guest banner (red strip) shown only for guests.
 */
export function getGuestBannerHTML(): string {
  return `
    <div class="bg-aucto-bg border-b-2 border-aucto-red">
      <div class="mx-auto max-w-7xl px-6 md:px-8 py-3">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 w-5 h-5 bg-aucto-red"></div>
          <div>
            <div
              class="text-sm font-bold text-slate-900 uppercase tracking-wide mb-1"
            >
              Browsing as Guest
            </div>
            <div class="text-sm text-slate-600">
              You can explore auctions, but you need an account to place bids
              and create listings.
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Guest navbar (no credits, login/register buttons).
 */
export function getGuestNavbarHTML(): string {
  return `
    <nav class="bg-aucto-bg">
      <div class="mx-auto max-w-7xl px-6 md:px-8 pt-5">
        <!-- Top row: brand + search + nav + auth -->
        <div
          class="flex items-center gap-3 pb-4 border-b border-aucto-borderLight"
        >
          <!-- Brand Logo - Compact -->
          <a
            href="/"
            class="inline-flex items-center gap-1.5 text-slate-900 hover:text-slate-700 transition-colors whitespace-nowrap flex-shrink-0"
          >
            <svg
              class="h-6 w-6"
              width="128"
              height="128"
              viewBox="0 0 128 128"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="Aucto icon"
            >
              <path
                d="M24 108 L64 20 L104 108 Z"
                fill="none"
                stroke="currentColor"
                stroke-width="14"
                stroke-linejoin="round"
              />
              <line
                x1="40"
                y1="72"
                x2="88"
                y2="72"
                stroke="currentColor"
                stroke-width="14"
                stroke-linecap="round"
              />
            </svg>
            <span class="hidden sm:inline font-bold text-sm">Aucto</span>
          </a>

          <!-- Inline search (grows to fill available space) -->
          <section
            aria-label="Global auction search"
            class="hidden md:flex flex-1 items-center gap-2"
          >
            <form class="flex-1" role="search" aria-label="Search auctions">
              <label for="global-search-input" class="sr-only">
                Search auctions
              </label>
              <div class="relative">
                <input
                  id="global-search-input"
                  name="q"
                  type="search"
                  placeholder="Search by title, description, or lot number..."
                  class="w-full bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none border-2 border-aucto-borderMid"
                />
                <i
                  class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 fa-solid fa-magnifying-glass text-sm text-slate-400"
                ></i>
              </div>
            </form>

            <!-- Filters pill -->
            <button
              id="toggle-advanced-filters"
              type="button"
              class="flex items-center gap-2 bg-white px-3 py-2 hover:bg-slate-50 border-2 border-aucto-borderMid"
              aria-expanded="false"
              aria-controls="advanced-filters-bar"
            >
              <i class="fa-solid fa-sliders text-sm"></i>
              <i
                class="fa-solid fa-chevron-down text-xs transition-transform"
                id="filters-chevron"
              ></i>
            </button>
          </section>

          <!-- Primary nav -->
          <div
            class="hidden items-center gap-6 text-sm font-bold text-slate-700 lg:flex"
          >
            <a href="#" class="text-slate-900 inline-flex items-center gap-1.5">
              <i class="fa-solid fa-house text-sm"></i>
              <span>Feed</span>
            </a>
            <a
              href="#"
              class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5"
            >
              <i class="fa-solid fa-layer-group text-sm"></i>
              <span>Catalog</span>
            </a>
            <a
              href="#"
              class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5"
            >
              <i class="fa-solid fa-gavel text-sm"></i>
              <span>My Bids</span>
            </a>
            <a
              href="#"
              class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5"
            >
              <i class="fa-solid fa-user text-sm"></i>
              <span>Profile</span>
            </a>
          </div>

          <!-- Auth buttons for guest -->
          <div class="flex items-center gap-3">
            <button
              class="hidden bg-white px-4 py-2 text-sm font-bold tracking-wide text-slate-900 hover:bg-slate-50 md:inline-flex border-2 border-aucto-borderDark"
            >
              Log in
            </button>
            <button
              class="bg-slate-900 px-4 py-2 text-sm font-bold tracking-wide text-white hover:bg-slate-800 border-2 border-aucto-borderDark"
            >
              Create account
            </button>
          </div>
        </div>

        <!-- Advanced filter bar (hidden by default) -->
        <div
          id="advanced-filters-bar"
          class="hidden px-4 py-4 md:px-6 md:py-4 bg-aucto-bg border-b-[3px] border-aucto-borderDark"
        >
          <div
            class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
          >
            <!-- Tag filters -->
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="bg-slate-900 px-4 py-2 text-[11px] font-bold tracking-[0.18em] uppercase text-white inline-flex items-center gap-2 border-2 border-aucto-borderDark"
                aria-pressed="true"
              >
                <i class="fa-solid fa-circle-check text-xs"></i>
                All
              </button>
              <button
                type="button"
                class="bg-white px-4 py-2 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2 border-2 border-aucto-borderMid"
                aria-pressed="false"
              >
                <i class="fa-solid fa-microchip text-xs"></i>
                Tech
              </button>
              <button
                type="button"
                class="bg-white px-4 py-2 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2 border-2 border-aucto-borderMid"
                aria-pressed="false"
              >
                <i class="fa-solid fa-shirt text-xs"></i>
                Fashion
              </button>
              <button
                type="button"
                class="bg-white px-4 py-2 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2 border-2 border-aucto-borderMid"
                aria-pressed="false"
              >
                <i class="fa-solid fa-house text-xs"></i>
                Home
              </button>
              <button
                type="button"
                class="bg-white px-4 py-2 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2 border-2 border-aucto-borderMid"
                aria-pressed="false"
              >
                <i class="fa-solid fa-gem text-xs"></i>
                Collectibles
              </button>
            </div>

            <!-- Status + sort -->
            <div class="flex flex-wrap items-center gap-3">
              <label
                class="flex cursor-pointer items-center gap-2 bg-white px-4 py-2 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-700 hover:bg-slate-50 border-2 border-aucto-borderMid"
              >
                <input
                  type="checkbox"
                  class="h-4 w-4 cursor-pointer accent-aucto-borderDark"
                />
                <span>Active only</span>
              </label>

              <div class="relative">
                <select
                  class="bg-white px-4 py-2 pr-8 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-700 hover:bg-slate-50 focus:outline-none border-2 border-aucto-borderMid"
                >
                  <option>Ending soon</option>
                  <option>Newest first</option>
                  <option>Oldest first</option>
                  <option>Highest bid</option>
                  <option>Lowest bid</option>
                </select>
                <div
                  class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <div
                    class="h-0 w-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-400"
                  ></div>
                </div>
              </div>

              <!-- Credits range -->
              <div class="flex items-center gap-2 text-[11px] text-slate-600">
                <span
                  class="font-bold tracking-[0.18em] uppercase text-slate-500"
                  >Credits</span
                >
                <input
                  type="number"
                  placeholder="Min"
                  class="w-20 bg-white px-2 py-1 text-xs focus:outline-none border border-slate-300"
                />
                <span class="text-slate-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  class="w-20 bg-white px-2 py-1 text-xs focus:outline-none border border-slate-300"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  `;
}

/**
 * Logged-in navbar (with credits + user avatar).
 */
export function getUserNavbarHTML(user: NavbarUser): string {
  return `
    <nav class="bg-aucto-bg">
      <div class="mx-auto max-w-7xl px-6 md:px-8 pt-5">
        <!-- Top row: brand + search + nav + credits -->
        <div
          class="flex items-center gap-3 pb-4 border-b border-aucto-borderLight"
        >
          <!-- Brand Logo - Compact -->
          <a
            href="/"
            class="inline-flex items-center gap-1.5 text-slate-900 hover:text-slate-700 transition-colors whitespace-nowrap flex-shrink-0"
          >
            <svg
              class="h-6 w-6"
              width="128"
              height="128"
              viewBox="0 0 128 128"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="Aucto icon"
            >
              <path
                d="M24 108 L64 20 L104 108 Z"
                fill="none"
                stroke="currentColor"
                stroke-width="14"
                stroke-linejoin="round"
              />
              <line
                x1="40"
                y1="72"
                x2="88"
                y2="72"
                stroke="currentColor"
                stroke-width="14"
                stroke-linecap="round"
              />
            </svg>
            <span class="hidden sm:inline font-bold text-sm">Aucto</span>
          </a>

          <!-- Inline search (grows to fill available space) -->
          <section
            aria-label="Global auction search"
            class="hidden md:flex flex-1 items-center gap-2"
          >
            <form class="flex-1" role="search" aria-label="Search auctions">
              <label for="global-search-input" class="sr-only">
                Search auctions
              </label>
              <div class="relative">
                <input
                  id="global-search-input"
                  name="q"
                  type="search"
                  placeholder="Search by title, description, or lot number..."
                  class="w-full bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none border-2 border-aucto-borderMid"
                />
                <i
                  class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 fa-solid fa-magnifying-glass text-sm text-slate-400"
                ></i>
              </div>
            </form>

            <!-- Filters pill -->
            <button
              id="toggle-advanced-filters"
              type="button"
              class="flex items-center gap-2 bg-white px-3 py-2 hover:bg-slate-50 border-2 border-aucto-borderMid"
              aria-expanded="false"
              aria-controls="advanced-filters-bar"
            >
              <i class="fa-solid fa-sliders text-sm"></i>
              <i
                class="fa-solid fa-chevron-down text-xs transition-transform"
                id="filters-chevron"
              ></i>
            </button>
          </section>

          <!-- Primary nav -->
          <div
            class="hidden items-center gap-6 text-sm font-bold text-slate-700 lg:flex"
          >
            <a href="#" class="text-slate-900 inline-flex items-center gap-1.5">
              <i class="fa-solid fa-house text-sm"></i>
              <span>Feed</span>
            </a>
            <a
              href="#"
              class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5"
            >
              <i class="fa-solid fa-layer-group text-sm"></i>
              <span>Catalog</span>
            </a>
            <a
              href="#"
              class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5"
            >
              <i class="fa-solid fa-gavel text-sm"></i>
              <span>My Bids</span>
            </a>
            <a
              href="#"
              class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5"
            >
              <i class="fa-solid fa-user text-sm"></i>
              <span>Profile</span>
            </a>
          </div>

          <!-- Credits + profile -->
          <div class="flex items-center gap-3">
            <div
              class="hidden items-center gap-2 bg-slate-50 px-4 py-2 sm:flex border-2 border-aucto-borderDark"
            >
              <span
                class="text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500"
              >
                Credits
              </span>
              <span class="text-base font-bold text-slate-900">
                ${user.credits.toLocaleString()}
              </span>
            </div>
            <button
              class="flex items-center gap-2 bg-white px-4 py-2 hover:bg-slate-50 border-2 border-aucto-borderDark"
            >
              <img
                src="${user.avatar}"
                alt="User avatar"
                class="h-8 w-8 object-cover border-2 border-aucto-borderDark"
              />
              <span class="hidden text-sm font-bold text-slate-900 md:block"
                >${user.name}</span
              >
            </button>
          </div>
        </div>

        <!-- Advanced filter bar (hidden by default) -->
        <div
          id="advanced-filters-bar"
          class="hidden px-4 py-4 md:px-6 md:py-4 bg-aucto-bg border-b-[3px] border-aucto-borderDark"
        >
          <div
            class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
          >
            <!-- Tag filters -->
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="bg-slate-900 px-4 py-2 text-[11px] font-bold tracking-[0.18em] uppercase text-white border-2 border-aucto-borderDark"
                aria-pressed="true"
              >
                All
              </button>
              <button
                type="button"
                class="bg-white px-4 py-2 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-700 hover:bg-slate-50 border-2 border-aucto-borderMid"
                aria-pressed="false"
              >
                Tech
              </button>
              <button
                type="button"
                class="bg-white px-4 py-2 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-700 hover:bg-slate-50 border-2 border-aucto-borderMid"
                aria-pressed="false"
              >
                Fashion
              </button>
              <button
                type="button"
                class="bg-white px-4 py-2 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-700 hover:bg-slate-50 border-2 border-aucto-borderMid"
                aria-pressed="false"
              >
                Home
              </button>
              <button
                type="button"
                class="bg-white px-4 py-2 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-700 hover:bg-slate-50 border-2 border-aucto-borderMid"
                aria-pressed="false"
              >
                Collectibles
              </button>
            </div>

            <!-- Status + sort -->
            <div class="flex flex-wrap items-center gap-3">
              <label
                class="flex cursor-pointer items-center gap-2 bg-white px-4 py-2 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-700 hover:bg-slate-50 border-2 border-aucto-borderMid"
              >
                <input
                  type="checkbox"
                  class="h-4 w-4 cursor-pointer accent-aucto-borderDark"
                />
                <span>Active only</span>
              </label>

              <div class="relative">
                <select
                  class="bg-white px-4 py-2 pr-8 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-700 hover:bg-slate-50 focus:outline-none border-2 border-aucto-borderMid"
                >
                  <option>Ending soon</option>
                  <option>Newest first</option>
                  <option>Oldest first</option>
                  <option>Highest bid</option>
                  <option>Lowest bid</option>
                </select>
                <div
                  class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <div
                    class="h-0 w-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-400"
                  ></div>
                </div>
              </div>

              <!-- Credits range -->
              <div class="flex items-center gap-2 text-[11px] text-slate-600">
                <span
                  class="font-bold tracking-[0.18em] uppercase text-slate-500"
                  >Credits</span
                >
                <input
                  type="number"
                  placeholder="Min"
                  class="w-20 bg-white px-2 py-1 text-xs focus:outline-none border border-slate-300"
                />
                <span class="text-slate-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  class="w-20 bg-white px-2 py-1 text-xs focus:outline-none border border-slate-300"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  `;
}

/**
 * Mounts any navbar HTML into the page and wires up interactions.
 */
export function mountNavbar(selector: string, html: string): void {
  const container = document.querySelector<HTMLElement>(selector);
  if (!container) {
    console.error(`[navbar] Container not found: ${selector}`);
    return;
  }
  container.innerHTML = html;
  initializeNavbarInteractions();
}

/**
 * Handles advanced filter toggle + search focus behavior.
 * Works for both guest + user nav variants.
 */
function initializeNavbarInteractions(): void {
  const searchInput = document.getElementById(
    "global-search-input"
  ) as HTMLInputElement | null;
  const toggleBtn = document.getElementById(
    "toggle-advanced-filters"
  ) as HTMLButtonElement | null;
  const filterBar = document.getElementById(
    "advanced-filters-bar"
  ) as HTMLDivElement | null;
  const chevron = document.getElementById(
    "filters-chevron"
  ) as HTMLElement | null;

  function openFilters(): void {
    if (!filterBar || !toggleBtn) return;
    if (!filterBar.classList.contains("hidden")) return;
    filterBar.classList.remove("hidden");
    if (chevron) {
      chevron.classList.add("rotate-180");
    }
    toggleBtn.setAttribute("aria-expanded", "true");
  }

  function toggleFilters(): void {
    if (!filterBar || !toggleBtn) return;
    filterBar.classList.toggle("hidden");
    const isOpen = !filterBar.classList.contains("hidden");
    toggleBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    if (chevron) {
      chevron.classList.toggle("rotate-180", isOpen);
    }
  }

  if (searchInput) {
    searchInput.addEventListener("focus", openFilters);
  }
  if (toggleBtn) {
    toggleBtn.addEventListener("click", toggleFilters);
  }
}
