import { renderHeader } from '../components/navbar';
import { renderFooter } from '../components/Footer';

/**
 * Initialize collection page
 */
export function initCollectionPage(): void {
  // Render header and footer
  renderHeader();
  renderFooter();

  // Load collection data
  loadCollectionData();
}

/**
 * Load collection data from API
 */
async function loadCollectionData(): Promise<void> {
  const container = document.getElementById('collection-content');
  if (!container) return;

  // Show loading state
  container.innerHTML = `
    <div class="flex items-center justify-center py-20">
      <div class="text-center">
        <i class="fa-solid fa-spinner fa-spin text-4xl text-slate-400 mb-4"></i>
        <p class="text-slate-600">Loading your collection...</p>
      </div>
    </div>
  `;

  try {
    // TODO: Implement API call to fetch user's won items and active bids
    // const collection = await getUserCollection();
    // renderCollection(collection);

    // Placeholder for now
    container.innerHTML = `
      <div class="space-y-6">
        <!-- Won Items Section -->
        <section>
          <h2 class="mb-4 text-2xl font-bold text-slate-900">Won Items</h2>
          <div class="bg-white p-8 text-center" style="border: 3px solid #1e293b">
            <i class="fa-solid fa-trophy text-6xl text-slate-300 mb-4"></i>
            <p class="text-slate-600">Your won items will appear here</p>
          </div>
        </section>

        <!-- Active Bids Section -->
        <section>
          <h2 class="mb-4 text-2xl font-bold text-slate-900">Active Bids</h2>
          <div class="bg-white p-8 text-center" style="border: 3px solid #1e293b">
            <i class="fa-solid fa-gavel text-6xl text-slate-300 mb-4"></i>
            <p class="text-slate-600">Your active bids will appear here</p>
          </div>
        </section>

        <!-- Watchlist Section -->
        <section>
          <h2 class="mb-4 text-2xl font-bold text-slate-900">Watchlist</h2>
          <div class="bg-white p-8 text-center" style="border: 3px solid #1e293b">
            <i class="fa-solid fa-bookmark text-6xl text-slate-300 mb-4"></i>
            <p class="text-slate-600">Your watched items will appear here</p>
          </div>
        </section>
      </div>
    `;
  } catch (error) {
    console.error('Error loading collection:', error);
    showError('Failed to load collection data');
  }
}

/**
 * Show error message
 */
function showError(message: string): void {
  const container = document.getElementById('collection-content');
  if (!container) return;

  container.innerHTML = `
    <div class="bg-white p-8 text-center" style="border: 3px solid #1e293b">
      <i class="fa-solid fa-exclamation-circle text-6xl text-red-300 mb-4"></i>
      <h3 class="font-serif font-bold text-xl text-slate-900 mb-2">Error</h3>
      <p class="text-slate-600 mb-4">${message}</p>
      <button
        onclick="window.location.reload()"
        class="bg-slate-900 text-white px-6 py-3 hover:bg-slate-800 transition-colors"
        style="border: 2px solid #1e293b"
      >
        Reload Page
      </button>
    </div>
  `;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCollectionPage);
} else {
  initCollectionPage();
}
