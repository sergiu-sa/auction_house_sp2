import { getCurrentUser } from '../utils/auth';
import { getProfileWins } from '../api/profile';
import { recentlyEnded, trending } from '../api/listingQueries';
import { logError } from '../utils/logger';
import type { Listing } from '../types/api';
import { highestBid } from '../utils/biddingStats';
import { escapeHtml } from '../utils/escapeHtml';

export interface FeaturedWinData {
  lotNumber: string;
  title: string;
  finalPrice: number;
  bidCount: number;
  description: string;
  winner: {
    username: string;
    avatar?: string;
    verified: boolean;
  };
  isUserWin: boolean;
  isEnded: boolean;
}

function getWinner(listing: Listing) {
  if (!listing.bids || listing.bids.length === 0) return null;

  const sortedBids = [...listing.bids].sort((a, b) => b.amount - a.amount);
  const winningBid = sortedBids[0];

  return winningBid.bidder;
}

function getLotNumber(listingId: string): string {
  return listingId.slice(-3).toUpperCase();
}

export function renderFeaturedWin(data: FeaturedWinData): string {
  // Label and status based on auction state
  let labelText: string;
  let statusText: string;
  let statusColor: string;

  if (data.isUserWin) {
    labelText = 'Your Recent Win';
    statusText = 'Won';
    statusColor = 'text-green-400';
  } else if (data.isEnded) {
    labelText = 'Recent Closing';
    statusText = 'Won';
    statusColor = 'text-green-400';
  } else {
    labelText = 'Popular Auction';
    statusText = 'Active';
    statusColor = 'text-slate-300';
  }

  return `
    <div class="mb-20 bg-slate-800 p-10 lg:p-12" style="border: 3px solid var(--aucto-border-mid)">
      <div class="mb-6 flex items-center gap-4">
        <div class="h-0.5 w-12 ${data.isUserWin ? 'bg-green-500' : data.isEnded ? 'bg-aucto-red' : 'bg-slate-500'}"></div>
        <span class="text-xs font-bold tracking-widest text-slate-400 uppercase">
          ${labelText}
        </span>
      </div>

      <div class="mb-6 flex items-center justify-between pb-6" style="border-bottom: 2px solid #475569">
        <span class="text-xs font-bold tracking-widest text-slate-400 uppercase">
          Lot ${data.lotNumber}
        </span>
        <span class="text-xs font-bold tracking-widest ${statusColor} uppercase">
          ${statusText}
        </span>
      </div>

      <h3 class="mb-4 text-3xl font-bold text-white">
        ${escapeHtml(data.title)}
      </h3>

      <div class="mb-6 flex items-baseline gap-4">
        <div class="text-4xl font-bold text-white">
          ${new Intl.NumberFormat('en-US').format(data.finalPrice)}
        </div>
        <div class="text-sm text-slate-400">
          Credits · ${data.bidCount} bids
        </div>
      </div>

      <p class="mb-6 text-sm leading-relaxed text-slate-300">
        ${escapeHtml(data.description || 'A successful auction with competitive bidding.')}
      </p>

      <div class="flex items-center gap-3 pt-6" style="border-top: 2px solid #475569">
        ${
          data.winner.avatar
            ? `<img
                src="${escapeHtml(data.winner.avatar)}"
                alt="${escapeHtml(data.winner.username)}"
                class="h-10 w-10 object-cover"
                style="border: 2px solid #475569"
                onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';"
              />
              <div class="h-10 w-10 bg-slate-700 items-center justify-center text-white font-bold text-sm hidden" style="border: 2px solid #475569; display: none;">
                ${escapeHtml(data.winner.username.charAt(0).toUpperCase())}
              </div>`
            : `<div class="h-10 w-10 bg-slate-700 flex items-center justify-center text-white font-bold text-sm" style="border: 2px solid #475569">
                ${escapeHtml(data.winner.username.charAt(0).toUpperCase())}
              </div>`
        }
        <div>
          <div class="text-sm font-bold text-white">${escapeHtml(data.winner.username)}</div>
          <div class="text-xs text-slate-400">${
            data.isUserWin
              ? 'You'
              : data.isEnded
                ? 'Winning Bidder'
                : 'Leading Bidder'
          }</div>
        </div>
      </div>
    </div>
  `;
}

function convertListingToFeaturedWin(
  listing: Listing,
  currentUserName?: string
): FeaturedWinData | null {
  const winner = getWinner(listing);
  if (!winner) return null;

  const currentHighest = highestBid(listing.bids);
  const isUserWin = currentUserName ? winner.name === currentUserName : false;
  const isEnded = new Date(listing.endsAt) < new Date();

  return {
    lotNumber: getLotNumber(listing.id),
    title: listing.title,
    finalPrice: currentHighest,
    bidCount: listing._count?.bids || listing.bids?.length || 0,
    description:
      listing.description || 'A successful auction with competitive bidding.',
    winner: {
      username: winner.name,
      avatar: winner.avatar?.url,
      verified: true,
    },
    isUserWin,
    isEnded,
  };
}

// Priority: user's most recent win > recently ended auction with bids > active auction with most bids.
export async function fetchFeaturedWin(): Promise<FeaturedWinData | null> {
  try {
    const user = getCurrentUser();
    if (!user) return null;

    // Try to get user's most recent win first
    const winsResponse = await getProfileWins(user.name);

    if (winsResponse.data && winsResponse.data.length > 0) {
      // Get the most recent win
      const mostRecentWin = winsResponse.data[0];
      const winData = convertListingToFeaturedWin(mostRecentWin, user.name);
      if (winData) {
        return winData;
      }
    }

    // If the user has no wins, show the platform's most recent close instead.
    const [mostRecentlyEnded] = await recentlyEnded(1);

    if (mostRecentlyEnded) {
      return convertListingToFeaturedWin(mostRecentlyEnded, user.name);
    }

    // Nothing has closed with a bid on it — show the busiest live lot.
    const [mostPopular] = await trending(1);

    return mostPopular
      ? convertListingToFeaturedWin(mostPopular, user.name)
      : null;
  } catch (error) {
    logError('Failed to fetch featured win', error);
    return null;
  }
}

export async function initFeaturedWin(): Promise<void> {
  const container = document.getElementById('featured-win-container');
  if (!container) {
    return;
  }

  // Hide for guests
  const user = getCurrentUser();
  if (!user) {
    container.innerHTML = '';
    return;
  }

  // Loading state
  container.innerHTML = `
    <div class="mb-20 bg-slate-800 p-10 lg:p-12 flex items-center justify-center" style="border: 3px solid var(--aucto-border-mid)">
      <div class="text-slate-400">
        <i class="fa-solid fa-spinner fa-spin text-2xl" aria-hidden="true"></i>
      </div>
    </div>
  `;

  const data = await fetchFeaturedWin();

  if (!data) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = renderFeaturedWin(data);
}
