import type { Listing } from '../types/api';
import { highestBid } from '../utils/biddingStats';
import { formatTimeRemaining } from '../utils/formatDate';
import { formatCurrency } from '../utils/formatCurrency';
import { generateResponsiveImageAttrs } from '../utils/imageOptimization';
import { escapeHtml } from '../utils/escapeHtml';
import { lotImageSource } from '../utils/listingImage';
import { isLoggedIn, profileHref } from '../utils/auth';

// Tiles are a third of a column, not a full-width card, so the card presets are wrong here.
const HERO_MAIN_SIZES =
  '(max-width: 1023px) 80vw, (max-width: 1279px) 32vw, 420px';
const HERO_TILE_SIZES =
  '(max-width: 1023px) 40vw, (max-width: 1279px) 15vw, 200px';

/**
 * The home hero's featured lots: one wide lot and up to two tiles beneath it.
 *
 * The caller writes the returned string into `#hero-mosaic` and arms the image fallbacks.
 * `main.css` reserves that element's height while it is `:empty`, and the reservation is measured per breakpoint;
 *   a tile that renders taller than the numbers there reopens the layout shift it exists to prevent.
 * Measure the mosaic with its `min-height` zeroed before changing any of this.
 */
export function renderHeroMosaic(featured: Listing[]): string {
  if (featured.length === 0) {
    return `
      <div class="col-span-full flex items-center justify-center p-12 bg-slate-50" style="border: 3px solid var(--aucto-border-dark)">
        <p class="text-slate-600">No featured listings available at this time.</p>
      </div>
    `;
  }

  const main = featured[0];
  const secondary = featured.slice(1);

  // The mosaic's card titles are h3, directly under the hero h1.
  // Naming the group restores the level the outline was skipping;
  //  it is sr-only because the hero already reads as one visually.
  return `
    <h2 class="sr-only">Featured auctions</h2>
    ${renderMainTile(main, secondary.length === 0)}
    ${renderSecondaryTiles(secondary)}
  `;
}

function renderMainTile(main: Listing, spansBothRows: boolean): string {
  const source = lotImageSource(main.media, main.title);
  const imgAttrs = generateResponsiveImageAttrs(
    source.src,
    source.alt,
    'landscape',
    HERO_MAIN_SIZES
  );

  return `
    <article class="${spansBothRows ? 'row-span-2' : 'row-span-1'} bg-slate-50" style="border: 3px solid var(--aucto-border-dark)">
      <div class="relative h-40 sm:h-48 md:h-52 bg-slate-200" style="border-bottom: 3px solid var(--aucto-border-dark)">
        <a href="/listing.html?id=${main.id}" class="block h-full">
          <img
            src="${escapeHtml(imgAttrs.src)}"
            ${imgAttrs.srcset ? `srcset="${escapeHtml(imgAttrs.srcset)}"` : ''}
            alt="${escapeHtml(imgAttrs.alt)}"
            sizes="${imgAttrs.sizes}"
            loading="eager"
            decoding="${imgAttrs.decoding}"
            class="h-full w-full object-cover"
            referrerpolicy="no-referrer"
            data-lot-image
          />
        </a>
        <div class="absolute left-4 top-4 bg-slate-900 px-3 py-1 text-[11px] font-bold tracking-[0.18em] uppercase text-white inline-flex items-center gap-1.5">
          <i class="fa-solid fa-fire text-amber-400" aria-hidden="true"></i>
          <span>Hot</span>
        </div>
        <div class="absolute right-4 bottom-4 bg-white px-3 py-1 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-900" style="border: 2px solid var(--aucto-border-dark)">
          ${formatTimeRemaining(main.endsAt)}
        </div>
      </div>
      <div class="p-5 md:p-6">
        <h3 class="mb-1 text-xl font-bold leading-tight text-slate-900">
          <a href="/listing.html?id=${main.id}" class="hover:underline">
            ${escapeHtml(main.title)}
          </a>
        </h3>
        <p class="mb-4 text-xs text-slate-600">
          Current bid
          <span class="font-semibold text-slate-900 inline-flex items-center gap-1">
            <i class="fa-solid fa-coins text-xs" aria-hidden="true"></i>
            <span>${formatCurrency(highestBid(main.bids))}</span>
          </span>
          ·
          <span class="inline-flex items-center gap-1">
            <i class="fa-solid fa-gavel text-xs" aria-hidden="true"></i>
            <span>${main._count?.bids || 0} bids</span>
          </span>
        </p>
        <div class="flex items-center justify-between text-xs text-slate-500">
          ${main.seller?.name ? `<a href="${profileHref(main.seller.name)}" class="hover:text-slate-900 transition-colors"${isLoggedIn() ? '' : ` aria-label="@${escapeHtml(main.seller.name)} (login required)"`}>@${escapeHtml(main.seller.name)}</a>` : '<span>@Unknown</span>'}
        </div>
      </div>
    </article>
  `;
}

/**
 * One of them must not sit in a two-column track with a hole beside it, and none of them means
 * the main lot takes both rows instead.
 *
 * `line-clamp-2` is the whole bound on a tile's title. It replaced a 30-character substring taken
 * in JavaScript, which could spend two characters on an ellipsis to save one — a recorded lot
 * titled "The Evil Dead Anthology Blu-Ray" is 31 characters and rendered as
 * "The Evil Dead Anthology Blu-Ra...". Measured across 320-1440: the clamp bounds the box at two
 * lines either way and the mosaic's height does not move, so the reservation is unaffected.
 */
function renderSecondaryTiles(secondary: Listing[]): string {
  if (secondary.length === 0) return '';

  const tiles = secondary
    .map((listing) => {
      const source = lotImageSource(listing.media, listing.title);
      const imgAttrs = generateResponsiveImageAttrs(
        source.src,
        source.alt,
        'square',
        HERO_TILE_SIZES
      );

      return `
        <article class="bg-slate-50" style="border: 3px solid var(--aucto-border-dark)">
          <div class="h-48 sm:h-52 md:h-56 bg-slate-200" style="border-bottom: 3px solid var(--aucto-border-dark)">
            <a href="/listing.html?id=${listing.id}" class="block h-full">
              <img
                src="${escapeHtml(imgAttrs.src)}"
                ${imgAttrs.srcset ? `srcset="${escapeHtml(imgAttrs.srcset)}"` : ''}
                alt="${escapeHtml(imgAttrs.alt)}"
                sizes="${imgAttrs.sizes}"
                loading="${imgAttrs.loading}"
                decoding="${imgAttrs.decoding}"
                class="h-full w-full object-cover"
                referrerpolicy="no-referrer"
                data-lot-image
              />
            </a>
          </div>
          <div class="p-2.5 sm:p-3">
            <h4 class="mb-1 text-sm font-bold text-slate-900 line-clamp-2">
              <a href="/listing.html?id=${listing.id}" class="hover:underline">
                ${escapeHtml(listing.title)}
              </a>
            </h4>
            <p class="text-[11px] text-slate-600">${formatCurrency(highestBid(listing.bids))}</p>
          </div>
        </article>
      `;
    })
    .join('');

  return `<div class="grid ${secondary.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-4">${tiles}</div>`;
}
