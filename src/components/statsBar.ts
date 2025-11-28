/**
 * Stats Bar component for logged-in users
 * Displays platform statistics in the footer
 */

export interface StatsData {
  activeLots: number;
  monthlyVolume: string;
  completedAuctions: number;
  satisfaction: number;
}

/**
 * Render the stats bar component
 * @param data - Optional stats data. If not provided, fetches from API
 * @returns HTML string for the stats bar section
 */
export function renderStatsBar(data?: StatsData): string {
  // Default data if none provided
  const defaultData: StatsData = {
    activeLots: 2547,
    monthlyVolume: '$2.4M',
    completedAuctions: 8921,
    satisfaction: 99.8
  };

  const stats = data || defaultData;

  return `
    <div class="mb-20 grid grid-cols-2 gap-6 md:grid-cols-4">
      <div class="bg-slate-800 p-6 text-center" style="border: 3px solid #334155">
        <div class="mb-2 text-4xl font-bold text-white" data-stat="activeLots">
          ${new Intl.NumberFormat('en-US').format(stats.activeLots)}
        </div>
        <div class="text-xs font-bold tracking-widest text-slate-400 uppercase">
          Active Lots
        </div>
      </div>

      <div class="bg-slate-800 p-6 text-center" style="border: 3px solid #334155">
        <div class="mb-2 text-4xl font-bold text-white" data-stat="monthlyVolume">
          ${stats.monthlyVolume}
        </div>
        <div class="text-xs font-bold tracking-widest text-slate-400 uppercase">
          This Month
        </div>
      </div>

      <div class="bg-slate-800 p-6 text-center" style="border: 3px solid #334155">
        <div class="mb-2 text-4xl font-bold text-white" data-stat="completedAuctions">
          ${new Intl.NumberFormat('en-US').format(stats.completedAuctions)}
        </div>
        <div class="text-xs font-bold tracking-widest text-slate-400 uppercase">
          Completed
        </div>
      </div>

      <div class="bg-slate-800 p-6 text-center" style="border: 3px solid #334155">
        <div class="mb-2 text-4xl font-bold text-white" data-stat="satisfaction">
          ${stats.satisfaction}%
        </div>
        <div class="text-xs font-bold tracking-widest text-slate-400 uppercase">
          Satisfaction
        </div>
      </div>
    </div>
  `;
}

/**
 * Fetch stats data from API
 * @returns Promise with stats data
 */
export async function fetchStats(): Promise<StatsData | null> {
  try {
    // In a real application, this would fetch from API
    
    // Simulated API call
    await new Promise(resolve => setTimeout(resolve, 100));

    return null; // Use default data
  } catch (error) {
    console.error('Error fetching stats:', error);
    return null;
  }
}

/**
 * Animate number counting effect
 * @param element - The element to animate
 * @param target - The target number
 * @param duration - Animation duration in milliseconds
 */
function animateNumber(element: HTMLElement, target: number, duration: number = 1000): void {
  const start = 0;
  const increment = target / (duration / 16); // 60fps
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }

    if (element.dataset.stat === 'satisfaction') {
      element.textContent = `${current.toFixed(1)}%`;
    } else if (element.dataset.stat === 'monthlyVolume') {
      // Skip animation for currency values
      element.textContent = element.textContent || '';
    } else {
      element.textContent = new Intl.NumberFormat('en-US').format(Math.floor(current));
    }
  }, 16);
}

/**
 * Initialize stats bar component with dynamic data
 * Fetches data from API, renders the component, and animates numbers
 */
export async function initStatsBar(): Promise<void> {
  const container = document.getElementById('stats-bar-container');
  if (!container) return;

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

  // Render component
  container.innerHTML = renderStatsBar(data || undefined);

  // Animate numbers if IntersectionObserver is available
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const stats = data || {
              activeLots: 2547,
              monthlyVolume: '$2.4M',
              completedAuctions: 8921,
              satisfaction: 99.8
            };

            // Animate each stat
            const activeLotsEl = container.querySelector('[data-stat="activeLots"]') as HTMLElement;
            const completedEl = container.querySelector('[data-stat="completedAuctions"]') as HTMLElement;
            const satisfactionEl = container.querySelector('[data-stat="satisfaction"]') as HTMLElement;

            if (activeLotsEl) animateNumber(activeLotsEl, stats.activeLots);
            if (completedEl) animateNumber(completedEl, stats.completedAuctions);
            if (satisfactionEl) animateNumber(satisfactionEl, stats.satisfaction);

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
 * Useful for real-time updates
 * @param data - New stats data
 */
export function updateStatsBar(data: StatsData): void {
  const container = document.getElementById('stats-bar-container');
  if (!container) return;

  const activeLotsEl = container.querySelector('[data-stat="activeLots"]') as HTMLElement;
  const monthlyVolumeEl = container.querySelector('[data-stat="monthlyVolume"]') as HTMLElement;
  const completedEl = container.querySelector('[data-stat="completedAuctions"]') as HTMLElement;
  const satisfactionEl = container.querySelector('[data-stat="satisfaction"]') as HTMLElement;

  if (activeLotsEl) {
    const currentValue = parseInt(activeLotsEl.textContent?.replace(/,/g, '') || '0');
    if (currentValue !== data.activeLots) {
      animateNumber(activeLotsEl, data.activeLots, 500);
    }
  }

  if (monthlyVolumeEl) {
    monthlyVolumeEl.textContent = data.monthlyVolume;
  }

  if (completedEl) {
    const currentValue = parseInt(completedEl.textContent?.replace(/,/g, '') || '0');
    if (currentValue !== data.completedAuctions) {
      animateNumber(completedEl, data.completedAuctions, 500);
    }
  }

  if (satisfactionEl) {
    const currentValue = parseFloat(satisfactionEl.textContent?.replace('%', '') || '0');
    if (currentValue !== data.satisfaction) {
      animateNumber(satisfactionEl, data.satisfaction, 500);
    }
  }
}
