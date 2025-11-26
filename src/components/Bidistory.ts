import type { Bid } from '../types/api';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate, getRelativeTime } from '../utils/formatDate';

/**
 * Render bid history for a listing
 */
export function renderBidHistory(
  bids: Bid[],
  containerId: string = 'bid-history'
): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (bids.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8">
        <i class="fa-solid fa-gavel text-4xl text-slate-300 mb-3"></i>
        <p class="text-slate-600">No bids yet. Be the first to bid!</p>
      </div>
    `;
    return;
  }

  // Sort bids by amount (descending)
  const sortedBids = [...bids].sort((a, b) => b.amount - a.amount);
  const highestBid = sortedBids[0];

  container.innerHTML = `
    <div class="space-y-3">
      ${sortedBids
        .map(
          (bid, index) => `
        <div class="flex items-center justify-between p-4 ${
          bid.id === highestBid.id
            ? 'bg-green-50 border-2 border-green-500'
            : 'bg-slate-50 border border-slate-200'
        }">
          <!-- Bidder Info -->
          <div class="flex items-center gap-3">
            ${
              bid.bidder?.avatar?.url
                ? `<img src="${bid.bidder.avatar.url}" alt="${bid.bidder.name}" class="w-10 h-10 rounded-full object-cover" />`
                : `<div class="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">${bid.bidder?.name?.charAt(0).toUpperCase() || '?'}</div>`
            }
            <div>
              <div class="font-medium text-sm flex items-center gap-2">
                ${bid.bidder?.name || 'Anonymous'}
                ${
                  bid.id === highestBid.id
                    ? '<span class="px-2 py-0.5 bg-green-500 text-white text-xs rounded">Highest</span>'
                    : ''
                }
              </div>
              <div class="text-xs text-slate-500" title="${formatDate(bid.created)}">
                ${getRelativeTime(bid.created)}
              </div>
            </div>
          </div>

          <!-- Bid Amount -->
          <div class="text-right">
            <div class="font-bold text-lg">
              ${formatCurrency(bid.amount)}
            </div>
            ${
              index === 0 && sortedBids.length > 1
                ? `<div class="text-xs text-green-600">+${formatCurrency(bid.amount - sortedBids[1].amount)} more</div>`
                : ''
            }
          </div>
        </div>
      `
        )
        .join('')}
    </div>

    <!-- Bid Summary -->
    <div class="mt-6 p-4 bg-slate-100 border border-slate-200">
      <div class="grid grid-cols-3 gap-4 text-center">
        <div>
          <div class="text-xs text-slate-500 uppercase tracking-wide mb-1">Total Bids</div>
          <div class="font-bold text-lg">${bids.length}</div>
        </div>
        <div>
          <div class="text-xs text-slate-500 uppercase tracking-wide mb-1">Highest Bid</div>
          <div class="font-bold text-lg">${formatCurrency(highestBid.amount)}</div>
        </div>
        <div>
          <div class="text-xs text-slate-500 uppercase tracking-wide mb-1">Bidders</div>
          <div class="font-bold text-lg">${new Set(bids.map(b => b.bidder?.name)).size}</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Create bid form HTML
 */
export function createBidForm(
  currentHighestBid: number = 0,
  userCredits: number = 0
): string {
  const minimumBid = currentHighestBid + 1;

  return `
    <form id="bid-form" class="space-y-4">
      <div>
        <label for="bid-amount" class="block text-sm font-medium text-slate-900 mb-2">
          Your Bid Amount
        </label>
        <div class="relative">
          <input
            type="number"
            id="bid-amount"
            name="amount"
            min="${minimumBid}"
            step="1"
            required
            placeholder="${minimumBid}"
            class="w-full px-4 py-3 text-lg font-bold border-2 border-slate-900 focus:outline-none focus:border-blue-500"
          />
          <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
            credits
          </span>
        </div>
        <div class="mt-2 flex items-center justify-between text-sm">
          <span class="text-slate-600">
            Minimum bid: <strong>${formatCurrency(minimumBid)}</strong>
          </span>
          <span class="text-slate-600">
            Your balance: <strong class="${userCredits >= minimumBid ? 'text-green-600' : 'text-red-600'}">${formatCurrency(userCredits)}</strong>
          </span>
        </div>
        <p id="bid-amount-error" class="hidden text-sm text-red-600 mt-1" role="alert"></p>
      </div>

      ${
        userCredits < minimumBid
          ? `
        <div class="p-3 bg-red-50 border border-red-200 text-red-800 text-sm">
          <i class="fa-solid fa-exclamation-circle"></i>
          You don't have enough credits to place a bid.
        </div>
      `
          : ''
      }

      <button
        type="submit"
        id="place-bid-btn"
        ${userCredits < minimumBid ? 'disabled' : ''}
        class="w-full bg-slate-900 text-white py-3 font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Place Bid
      </button>
    </form>
  `;
}

/**
 * Show bid form loading state
 */
export function showBidFormLoading(): void {
  const btn = document.getElementById('place-bid-btn') as HTMLButtonElement;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Placing Bid...';
  }
}

/**
 * Reset bid form loading state
 */
export function resetBidFormLoading(originalText: string = 'Place Bid'): void {
  const btn = document.getElementById('place-bid-btn') as HTMLButtonElement;
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}