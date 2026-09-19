import type { Listing } from '../types/api';
import { highestBid } from '../utils/biddingStats';
import { formatTimeRemaining, isAuctionActive } from '../utils/formatDate';
import { formatCredits } from '../utils/formatCurrency';
import { generateResponsiveImageAttrs } from '../utils/imageOptimization';
import { escapeHtml } from '../utils/escapeHtml';
import { lotImageSource } from '../utils/listingImage';

/**
 * A seller's own lot, as it appears in the grid on their profile.
 *
 * Its own shape rather than a `CollectionCard`: no favourite button and no quick-view, and the
 * owner gets an Edit control no other card carries. `isOwnProfile` is the only thing that varies,
 * and it is behaviour rather than presentation.
 */
export function createProfileListingCard(
  listing: Listing,
  isOwnProfile: boolean
): string {
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
        <a href="/listing.html?id=${listing.id}" class="block h-full">
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
        </a>
      </div>
      <div class="p-5">
        <div
          class="mb-2 flex items-center justify-between text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500"
        >
          <span>${escapeHtml(tag)}</span>
          <span>${bidsCount} ${bidsCount === 1 ? 'bid' : 'bids'}</span>
        </div>
        <h3 class="mb-2 text-xl font-bold leading-tight text-slate-900">
          <a href="/listing.html?id=${listing.id}" class="hover:underline">
            ${escapeHtml(listing.title)}
          </a>
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
