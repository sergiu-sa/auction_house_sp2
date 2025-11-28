/**
 * Featured Win component for logged-in users
 * Displays a recent winning auction in the footer
 */

export interface FeaturedWinData {
  lotNumber: string;
  title: string;
  finalPrice: number;
  bidCount: number;
  testimonial: string;
  winner: {
    username: string;
    avatar?: string;
    verified: boolean;
  };
}

/**
 * Render the featured win component
 * @param data - Optional featured win data. If not provided, fetches from API
 * @returns HTML string for the featured win section
 */
export function renderFeaturedWin(data?: FeaturedWinData): string {
  // Default data if none provided (matches design file exactly)
  const defaultData: FeaturedWinData = {
    lotNumber: '242',
    title: 'Rolex Submariner 5513',
    finalPrice: 12750,
    bidCount: 148,
    testimonial: 'Transparent bidding process. Highly recommended for serious collectors.',
    winner: {
      username: '@watchenthusiast',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
      verified: true
    }
  };

  const winData = data || defaultData;

  return `
    <div class="mb-20 bg-slate-800 p-10 lg:p-12" style="border: 3px solid #334155">
      <div class="mb-6 flex items-center gap-4">
        <div class="h-0.5 w-12 bg-red-700"></div>
        <span class="text-xs font-bold tracking-widest text-slate-400 uppercase">
          Recent Closing
        </span>
      </div>

      <div class="mb-6 flex items-center justify-between pb-6" style="border-bottom: 2px solid #475569">
        <span class="text-xs font-bold tracking-widest text-slate-400 uppercase">
          Lot ${winData.lotNumber}
        </span>
        <span class="text-xs font-bold tracking-widest text-green-400 uppercase">
          Won
        </span>
      </div>

      <h4 class="mb-4 text-3xl font-bold text-white">
        ${winData.title}
      </h4>

      <div class="mb-6 flex items-baseline gap-4">
        <div class="text-4xl font-bold text-white">
          ${new Intl.NumberFormat('en-US').format(winData.finalPrice)}
        </div>
        <div class="text-sm text-slate-400">
          Credits · ${winData.bidCount} bids
        </div>
      </div>

      <p class="mb-6 text-sm leading-relaxed text-slate-300">
        "${winData.testimonial}"
      </p>

      <div class="flex items-center gap-3 pt-6" style="border-top: 2px solid #475569">
        ${
          winData.winner.avatar
            ? `<img
                src="${winData.winner.avatar}"
                alt="${winData.winner.username}"
                class="h-10 w-10 object-cover"
                style="border: 2px solid #475569"
              />`
            : `<div class="h-10 w-10 bg-slate-700 flex items-center justify-center text-white font-bold text-sm" style="border: 2px solid #475569">
                ${winData.winner.username.charAt(1).toUpperCase()}
              </div>`
        }
        <div>
          <div class="text-sm font-bold text-white">${winData.winner.username}</div>
          <div class="text-xs text-slate-400">Verified Buyer</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Fetch featured win data from API
 * @returns Promise with featured win data
 */
export async function fetchFeaturedWin(): Promise<FeaturedWinData | null> {
  try {
    // In a real application, this would fetch from your API
    // Example: const response = await fetch('/api/featured-win');
    // For now, we'll return null to use default data

    // Simulated API call
    await new Promise(resolve => setTimeout(resolve, 100));

    return null; // Use default data
  } catch (error) {
    console.error('Error fetching featured win:', error);
    return null;
  }
}

/**
 * Initialize featured win component with dynamic data
 * Fetches data from API and renders the component
 */
export async function initFeaturedWin(): Promise<void> {
  const container = document.getElementById('featured-win-container');
  if (!container) return;

  // Show loading state
  container.innerHTML = `
    <div class="mb-20 bg-slate-800 p-10 lg:p-12 flex items-center justify-center" style="border: 3px solid #334155">
      <div class="text-slate-400">
        <i class="fa-solid fa-spinner fa-spin text-2xl"></i>
      </div>
    </div>
  `;

  // Fetch data
  const data = await fetchFeaturedWin();

  // Render component
  container.innerHTML = renderFeaturedWin(data || undefined);
}
