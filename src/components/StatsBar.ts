import { getCurrentUser } from '../utils/auth';
import {
  getProfileListings,
  getProfileBids,
  getProfileWins,
} from '../api/profile';
import { formatCurrency } from '../utils/formatCurrency';
import { logError } from '../utils/logger';
import type { Bid } from '../types/api';

export interface StatsData {
  myListings: number;
  myBids: number;
  winRate: number;
  activeBidsValue: number;
}

export function renderStatsBar(data: StatsData): string {
  return `
    <div class="mb-20 grid grid-cols-2 gap-6 md:grid-cols-4">
      <div class="bg-slate-800 p-6 text-center" style="border: 3px solid var(--aucto-border-mid)">
        <div class="mb-2 text-4xl font-bold text-white" data-stat="myListings">
          ${new Intl.NumberFormat('en-US').format(data.myListings)}
        </div>
        <div class="text-xs font-bold tracking-widest text-slate-400 uppercase">
          My Listings
        </div>
      </div>

      <div class="bg-slate-800 p-6 text-center" style="border: 3px solid var(--aucto-border-mid)">
        <div class="mb-2 text-4xl font-bold text-white" data-stat="myBids">
          ${new Intl.NumberFormat('en-US').format(data.myBids)}
        </div>
        <div class="text-xs font-bold tracking-widest text-slate-400 uppercase">
          My Bids
        </div>
      </div>

      <div class="bg-slate-800 p-6 text-center" style="border: 3px solid var(--aucto-border-mid)">
        <div class="mb-2 text-4xl font-bold text-white" data-stat="winRate">
          ${data.winRate.toFixed(1)}%
        </div>
        <div class="text-xs font-bold tracking-widest text-slate-400 uppercase">
          Win Rate
        </div>
      </div>

      <div class="bg-slate-800 p-6 text-center" style="border: 3px solid var(--aucto-border-mid)">
        <div class="mb-2 text-4xl font-bold text-white" data-stat="activeBidsValue">
          ${formatCurrency(data.activeBidsValue, true)}
        </div>
        <div class="text-xs font-bold tracking-widest text-slate-400 uppercase">
          Active Bids
        </div>
      </div>
    </div>
  `;
}

// Win rate = wins / unique auctions bid on. Multiple bids on the same listing count as one attempt.
function calculateWinRate(
  attemptedAuctions: number,
  totalWins: number
): number {
  if (attemptedAuctions === 0) return 0;
  const rate = (totalWins / attemptedAuctions) * 100;
  return Math.min(rate, 100);
}

function countAuctionsBidOn(bids: Bid[]): number {
  const ids = new Set<string>();
  for (const bid of bids) {
    if (bid.listing?.id) ids.add(bid.listing.id);
  }
  return ids.size;
}

// Sum of bids on auctions that haven't ended yet
function calculateActiveBidsValue(bids: Bid[]): number {
  const now = new Date();
  return bids
    .filter((bid) => bid.listing && new Date(bid.listing.endsAt) > now)
    .reduce((total, bid) => total + bid.amount, 0);
}

export async function fetchStats(): Promise<StatsData | null> {
  try {
    const user = getCurrentUser();
    if (!user) {
      return null;
    }

    // Fetch listings, bids and wins in parallel
    const [listingsResponse, bidsResponse, winsResponse] = await Promise.all([
      getProfileListings(user.name),
      getProfileBids(user.name),
      getProfileWins(user.name),
    ]);

    const myListings = listingsResponse.data.length;
    const myBids = bidsResponse.data.length;
    const totalWins = winsResponse.data?.length || 0;
    const auctionsBidOn = countAuctionsBidOn(bidsResponse.data);
    const winRate = calculateWinRate(auctionsBidOn, totalWins);
    const activeBidsValue = calculateActiveBidsValue(bidsResponse.data);

    return {
      myListings,
      myBids,
      winRate,
      activeBidsValue,
    };
  } catch (error) {
    logError('Failed to fetch stats', error);
    return null;
  }
}

function animateNumber(
  element: HTMLElement,
  target: number,
  isCurrency: boolean = false,
  duration: number = 1000
): void {
  const start = 0;
  const increment = target / (duration / 16); // 60fps
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }

    if (isCurrency) {
      element.textContent = formatCurrency(Math.floor(current), true);
    } else {
      element.textContent = new Intl.NumberFormat('en-US').format(
        Math.floor(current)
      );
    }
  }, 16);
}

function animateWinRate(
  element: HTMLElement,
  target: number,
  duration: number = 1000
): void {
  const start = 0;
  const increment = target / (duration / 16); // 60fps
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }

    element.textContent = `${current.toFixed(1)}%`;
  }, 16);
}

export async function initStatsBar(): Promise<void> {
  const container = document.getElementById('stats-bar-container');
  if (!container) return;

  // Hide stats for guests
  const user = getCurrentUser();
  if (!user) {
    container.innerHTML = '';
    return;
  }

  // Loading state
  container.innerHTML = `
    <div class="mb-20 grid grid-cols-2 gap-6 md:grid-cols-4">
      ${Array(4)
        .fill(0)
        .map(
          () => `
        <div class="bg-slate-800 p-6 text-center" style="border: 3px solid var(--aucto-border-mid)">
          <div class="mb-2 text-4xl font-bold text-slate-700">
            <i class="fa-solid fa-spinner fa-spin"></i>
          </div>
          <div class="text-xs font-bold tracking-widest text-slate-400 uppercase">
            Loading...
          </div>
        </div>
      `
        )
        .join('')}
    </div>
  `;

  const data = await fetchStats();

  if (!data) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = renderStatsBar(data);

  // Animate counters when the bar scrolls into view
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const myListingsEl = container.querySelector(
              '[data-stat="myListings"]'
            ) as HTMLElement;
            const myBidsEl = container.querySelector(
              '[data-stat="myBids"]'
            ) as HTMLElement;
            const winRateEl = container.querySelector(
              '[data-stat="winRate"]'
            ) as HTMLElement;
            const activeBidsValueEl = container.querySelector(
              '[data-stat="activeBidsValue"]'
            ) as HTMLElement;

            if (myListingsEl) animateNumber(myListingsEl, data.myListings);
            if (myBidsEl) animateNumber(myBidsEl, data.myBids);
            if (winRateEl) animateWinRate(winRateEl, data.winRate);
            if (activeBidsValueEl)
              animateNumber(activeBidsValueEl, data.activeBidsValue, true);

            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(container);
  }
}

// Update stats bar in place with new data (used after user actions)
export function updateStatsBar(data: StatsData): void {
  const container = document.getElementById('stats-bar-container');
  if (!container) return;

  const myListingsEl = container.querySelector(
    '[data-stat="myListings"]'
  ) as HTMLElement;
  const myBidsEl = container.querySelector(
    '[data-stat="myBids"]'
  ) as HTMLElement;
  const winRateEl = container.querySelector(
    '[data-stat="winRate"]'
  ) as HTMLElement;
  const activeBidsValueEl = container.querySelector(
    '[data-stat="activeBidsValue"]'
  ) as HTMLElement;

  if (myListingsEl) {
    const currentValue = parseInt(
      myListingsEl.textContent?.replace(/,/g, '') || '0'
    );
    if (currentValue !== data.myListings) {
      animateNumber(myListingsEl, data.myListings, false, 500);
    }
  }

  if (myBidsEl) {
    const currentValue = parseInt(
      myBidsEl.textContent?.replace(/,/g, '') || '0'
    );
    if (currentValue !== data.myBids) {
      animateNumber(myBidsEl, data.myBids, false, 500);
    }
  }

  if (winRateEl) {
    const currentValue = parseFloat(
      winRateEl.textContent?.replace('%', '') || '0'
    );
    if (currentValue !== data.winRate) {
      animateWinRate(winRateEl, data.winRate, 500);
    }
  }

  if (activeBidsValueEl) {
    const currentValue = parseInt(
      activeBidsValueEl.textContent?.replace(/[^\d]/g, '') || '0'
    );
    if (currentValue !== data.activeBidsValue) {
      animateNumber(activeBidsValueEl, data.activeBidsValue, true, 500);
    }
  }
}

// Refetch and update — call after creating a listing, placing a bid, etc.
export async function refreshStatsBar(): Promise<void> {
  const data = await fetchStats();
  if (data) {
    updateStatsBar(data);
  }
}
