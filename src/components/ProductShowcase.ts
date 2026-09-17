/**
 * The right-hand column of the login and register pages.
 *
 * Both pages ship `#product-showcase` empty, and main.css reserves its height until this module draws it:
 *  three of the newest active lots whose photographs load, refreshed every 15 seconds, or the paddles drawing when there are not three to show.
 * The lots are decoration here, so a placeholder plate would read as the page failing; `newestWithImages` gives the home hero's answer instead.
 *
 * The templates carry no API data.
 * Every lot field is written with `textContent` or `setAttribute`, so nothing a seller types is parsed as markup.
 */

import { newestWithImages } from '../api/listingQueries';
import type { Listing } from '../types/api';
import { formatTimeRemaining, getTimeRemaining } from '../utils/formatDate';
import { generateResponsiveImageAttrs } from '../utils/imageOptimization';
import { lotImageSource, setLotImageSource } from '../utils/listingImage';
import { logError } from '../utils/logger';
import { renderAuctionPaddles } from './AuctionPaddles';

const REFRESH_INTERVAL_MS = 15000;
const TILE_COUNT = 3;

// The widest each image box renders, measured 320-1440px, so srcset picks the smallest variant that still fills it.
const FEATURED_SIZES = '(max-width: 1023px) 90vw, 440px';
const SMALL_SIZES = '(max-width: 1023px) 45vw, 220px';

const BORDER = 'border: 3px solid var(--aucto-border-dark)';
const BORDER_BOTTOM = 'border-bottom: 3px solid var(--aucto-border-dark)';

const IMAGE = `<img data-lot-image alt="" aria-hidden="true" decoding="async" referrerpolicy="no-referrer" class="h-full w-full object-cover" />`;

function smallTile(name: string): string {
  return `
    <article data-tile="${name}" class="flex flex-col bg-slate-50" style="${BORDER}">
      <div class="h-48 bg-slate-200 sm:h-52 md:h-56" style="${BORDER_BOTTOM}">${IMAGE}</div>
      <div class="p-2.5 sm:p-3">
        <div data-slot="byline" class="mb-1 truncate text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500"></div>
        <p data-slot="title" class="truncate text-xs font-semibold text-slate-900"></p>
        <p data-slot="meta" class="mt-1 text-[11px] text-slate-600"></p>
      </div>
    </article>`;
}

const LOT_TILES = `
  <article data-tile="featured" class="min-w-0 bg-slate-50" style="${BORDER}">
    <div class="relative h-40 bg-slate-200 sm:h-48 md:h-56" style="${BORDER_BOTTOM}">
      ${IMAGE}
      <div class="absolute left-3 top-3 bg-slate-900 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">Just listed</div>
      <div data-slot="time-left" class="absolute bottom-3 right-3 bg-white px-3 py-1 text-xs font-semibold text-slate-900" style="${BORDER}"></div>
    </div>
    <div class="p-4">
      <div data-slot="byline" class="mb-2 truncate text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500"></div>
      <h2 data-slot="title" class="mb-1 truncate font-serif text-xl font-bold text-slate-900"></h2>
      <p data-slot="description" class="line-clamp-2 h-8 break-words text-xs text-slate-600"></p>
    </div>
  </article>
  <div class="grid grid-cols-2 gap-4">${smallTile('tile-a')}${smallTile('tile-b')}</div>`;

function paddlesPanel(): string {
  return `<div data-tile="paddles" aria-hidden="true" class="relative overflow-hidden bg-slate-50 lg:row-span-2" style="${BORDER}">${renderAuctionPaddles()}</div>`;
}

/**
 * Draw the showcase into `section`: `lots` when there are three, otherwise the paddles.
 * Called again on every refresh, it rewrites only what changed, so a tile showing the same lot keeps its image untouched.
 */
export function mountProductShowcase(
  section: HTMLElement,
  lots: Listing[]
): void {
  if (lots.length < TILE_COUNT) {
    if (section.dataset.showcase === 'paddles') return;
    section.innerHTML = paddlesPanel();
    section.dataset.showcase = 'paddles';
    return;
  }

  if (section.dataset.showcase !== 'lots') {
    section.innerHTML = LOT_TILES;
    section.dataset.showcase = 'lots';
  }

  const [featured, tileA, tileB] = lots;
  fillTile(section, 'featured', featured, FEATURED_SIZES);
  fillTile(section, 'tile-a', tileA, SMALL_SIZES);
  fillTile(section, 'tile-b', tileB, SMALL_SIZES);
}

/**
 * Fetch and draw once, then refresh every 15 seconds.
 * A refresh that fails, or finds fewer than three lots, keeps the lots already on screen rather than swapping them for the drawing.
 */
export async function initProductShowcase(): Promise<void> {
  const section = document.getElementById('product-showcase');
  if (!section) return;

  await refresh(section);

  setInterval(() => {
    refresh(section);
  }, REFRESH_INTERVAL_MS);
}

let lastRequest = 0;
let drawnRequest = 0;

async function refresh(section: HTMLElement): Promise<void> {
  const request = ++lastRequest;
  let lots: Listing[] = [];
  try {
    lots = await newestWithImages(TILE_COUNT);
  } catch (error) {
    logError('Failed to load the login and register showcase', error);
  }

  // Older than what is already drawn, so drawing it would put older lots back.
  // Compared with the last request drawn, not the last one started: on a network slower than the interval, every answer arrives after the next request starts.
  if (request < drawnRequest) return;
  // Too few lots draws nothing once anything is up: lots stay rather than give way to the drawing, and the drawing is already there.
  // Returning before `drawnRequest` moves is what lets an older answer that does have lots still replace the drawing.
  if (lots.length < TILE_COUNT && section.dataset.showcase) return;
  mountProductShowcase(section, lots);
  drawnRequest = request;
}

function fillTile(
  section: HTMLElement,
  name: string,
  lot: Listing,
  sizes: string
): void {
  const tile = section.querySelector<HTMLElement>(`[data-tile="${name}"]`);
  if (!tile) return;

  const img = tile.querySelector<HTMLImageElement>('img[data-lot-image]');
  const source = lotImageSource(lot.media, lot.title);
  // Only when the lot changed: re-pointing an image at its own URL restarts its load, and the fallback can read that restart as a failure.
  // Compared against what was asked for, not `src`, which the fallback rewrites; otherwise a dead photograph is retried every refresh.
  if (img && img.dataset.lotSrc !== source.src) {
    img.dataset.lotSrc = source.src;
    const attrs = generateResponsiveImageAttrs(
      source.src,
      source.alt,
      'landscape',
      sizes
    );
    setLotImageSource(img, attrs.src, attrs.alt, {
      srcset: attrs.srcset,
      sizes: attrs.sizes,
    });
  }

  const seller = `@${lot.seller?.name || 'Unknown'}`;
  const bids = bidLabel(lot);
  const left = timeLeft(lot.endsAt);

  setSlot(tile, 'title', lot.title);
  if (name === 'featured') {
    setSlot(tile, 'time-left', left);
    setSlot(tile, 'byline', `${seller} • ${bids}`);
    setSlot(tile, 'description', lot.description ?? '');
  } else {
    setSlot(tile, 'byline', seller);
    setSlot(tile, 'meta', `${bids} • ${left}`);
  }
}

function setSlot(tile: HTMLElement, slot: string, text: string): void {
  const element = tile.querySelector(`[data-slot="${slot}"]`);
  if (element && element.textContent !== text) element.textContent = text;
}

function bidLabel(lot: Listing): string {
  const count = lot.bids?.length ?? lot._count?.bids ?? 0;
  if (count === 0) return 'No bids yet';
  return `${count} ${count === 1 ? 'bid' : 'bids'}`;
}

function timeLeft(endsAt: string): string {
  const remaining = formatTimeRemaining(endsAt);
  return getTimeRemaining(endsAt).expired ? remaining : `${remaining} left`;
}
