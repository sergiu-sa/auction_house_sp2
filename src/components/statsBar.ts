/**
 * Stats Bar component for logged-in users
 * Displays user-specific and platform statistics in the footer
 */

import { getCurrentUser } from '../utils/auth';
import { getProfileListings, getProfileBids, getProfileWins } from '../api/profile';
import type { Bid } from '../types/api';

export interface StatsData {
  myListings: number;
  myBids: number;
  winRate: number; 
  activeBidsValue: number;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Render the stats bar component
 * @param data - Stats data to display
 * @returns HTML string for the stats bar section
 */
export function renderStatsBar(data: StatsData): string {
  return `
    <div class="mb-20 grid grid-cols-2 gap-6 md:grid-cols-4">
      <div class="bg-slate-800 p-6 text-center" style="border: 3px solid #334155">
        <div class="mb-2 text-4xl font-bold text-white" data-stat="myListings">
          ${new Intl.NumberFormat('en-US').format(data.myListings)}
        </div>
        <div class="text-xs font-bold tracking-widest text-slate-400 uppercase">
          My Listings
        </div>
      </div>

      <div class="bg-slate-800 p-6 text-center" style="border: 3px solid #334155">
        <div class="mb-2 text-4xl font-bold text-white" data-stat="myBids">
          ${new Intl.NumberFormat('en-US').format(data.myBids)}
        </div>
        <div class="text-xs font-bold tracking-widest text-slate-400 uppercase">
          My Bids
        </div>
      </div>

      <div class="bg-slate-800 p-6 text-center" style="border: 3px solid #334155">
        <div class="mb-2 text-4xl font-bold text-white" data-stat="winRate">
          ${data.winRate.toFixed(1)}%
        </div>
        <div class="text-xs font-bold tracking-widest text-slate-400 uppercase">
          Win Rate
        </div>
      </div>

      <div class="bg-slate-800 p-6 text-center" style="border: 3px solid #334155">
        <div class="mb-2 text-4xl font-bold text-white" data-stat="activeBidsValue">
          ${formatCurrency(data.activeBidsValue)}
        </div>
        <div class="text-xs font-bold tracking-widest text-slate-400 uppercase">
          Active Bids
        </div>
      </div>
    </div>
  `;
}

/**
 * Calculate win rate percentage
 * @param totalBids - Total number of bids placed
 * @param totalWins - Total number of auctions won
 * @returns Win rate as a percentage (0-100)
 */
function calculateWinRate(totalBids: number, totalWins: number): number {
  if (totalBids === 0) return 0;
  return (totalWins / totalBids) * 100;
}

/**
 * Calculate total value of active bids
 * @param bids - Array of user's bids with listing details
 * @returns Total value of bids on auctions that haven't ended yet
 */
function calculateActiveBidsValue(bids: Bid[]): number {
  const now = new Date();
  return bids
    .filter(bid => bid.listing && new Date(bid.listing.endsAt) > now)
    .reduce((total, bid) => total + bid.amount, 0);
}

/**
 * Fetch real stats data from API for logged-in user
 * @returns Promise with stats data or null if error
 */
export async function fetchStats(): Promise<StatsData | null> {
  try {
    const user = getCurrentUser();
    if (!user) {
      return null;
    }

    // Fetch data in parallel for better performance
    const [listingsResponse, bidsResponse, winsResponse] =
      await Promise.all([
        getProfileListings(user.name),
        getProfileBids(user.name), 
        getProfileWins(user.name)
      ]);

    // Calculate stats
    const myListings = listingsResponse.data.length;
    const myBids = bidsResponse.data.length;
    const totalWins = winsResponse.data?.length || 0;
    const winRate = calculateWinRate(myBids, totalWins);
    const activeBidsValue = calculateActiveBidsValue(bidsResponse.data);

    return {
      myListings,
      myBids,
      winRate,
      activeBidsValue
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return null;
  }
}

/**
 * Animate number counting effect
 * @param element - The element to animate
 * @param target - The target number
 * @param isCurrency - Whether to format as currency
 * @param duration - Animation duration in milliseconds
 */
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
      element.textContent = formatCurrency(Math.floor(current));
    } else {
      element.textContent = new Intl.NumberFormat('en-US').format(Math.floor(current));
    }
  }, 16);
}

/**
 * Animate win rate percentage
 * @param element - The element to animate
 * @param target - The target percentage
 * @param duration - Animation duration in milliseconds
 */
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

/**
 * Initialize stats bar component with dynamic data
 * Fetches data from API, renders the component, and animates numbers
 */
export async function initStatsBar(): Promise<void> {
  const container = document.getElementById('stats-bar-container');
  if (!container) return;

  // Check if user is logged in
  const user = getCurrentUser();
  if (!user) {
    container.innerHTML = ''; // Don't show stats for guests
    return;
  }

  // Show loading state
  container.innerHTML = `
    <div class="mb-20 grid grid-cols-2 gap-6 md:grid-cols-4">
      ${Array(4)
        .fill(0)
        .map(
          () => `
        <div class="bg-slate-800 p-6 text-center" style="border: 3px solid #334155">
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

  // Fetch data
  const data = await fetchStats();

  if (!data) {
    container.innerHTML = ''; // Hide on error
    return;
  }

  // Render component
  container.innerHTML = renderStatsBar(data);

  // Animate numbers if IntersectionObserver is available
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Animate each stat
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
            if (activeBidsValueEl) animateNumber(activeBidsValueEl, data.activeBidsValue, true);

            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(container);
  }
}

/**
 * Update stats bar with new data
 * Useful for real-time updates or after user actions
 * @param data - New stats data
 */
export function updateStatsBar(data: StatsData): void {
  const container = document.getElementById('stats-bar-container');
  if (!container) return;

  const myListingsEl = container.querySelector('[data-stat="myListings"]') as HTMLElement;
  const myBidsEl = container.querySelector('[data-stat="myBids"]') as HTMLElement;
  const winRateEl = container.querySelector('[data-stat="winRate"]') as HTMLElement;
  const activeBidsValueEl = container.querySelector('[data-stat="activeBidsValue"]') as HTMLElement;

  if (myListingsEl) {
    const currentValue = parseInt(myListingsEl.textContent?.replace(/,/g, '') || '0');
    if (currentValue !== data.myListings) {
      animateNumber(myListingsEl, data.myListings, false, 500);
    }
  }

  if (myBidsEl) {
    const currentValue = parseInt(myBidsEl.textContent?.replace(/,/g, '') || '0');
    if (currentValue !== data.myBids) {
      animateNumber(myBidsEl, data.myBids, false, 500);
    }
  }

  if (winRateEl) {
    const currentValue = parseFloat(winRateEl.textContent?.replace('%', '') || '0');
    if (currentValue !== data.winRate) {
      animateWinRate(winRateEl, data.winRate, 500);
    }
  }

  if (activeBidsValueEl) {
    const currentValue = parseInt(
      activeBidsValueEl.textContent?.replace(/[$,]/g, '') || '0'
    );
    if (currentValue !== data.activeBidsValue) {
      animateNumber(activeBidsValueEl, data.activeBidsValue, true, 500);
    }
  }
}

/**
 * Refresh stats bar - fetches and updates with latest data
 * Useful after creating a listing, placing a bid, etc.
 */
export async function refreshStatsBar(): Promise<void> {
  const data = await fetchStats();
  if (data) {
    updateStatsBar(data);
  }
}
