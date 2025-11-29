import { renderHeader } from '../components/navbar';
import { renderFooter } from '../components/Footer';

/**
 * Initialize listing edit page
 */
export function initListingEditPage(): void {
  // Render header and footer
  renderHeader();
  renderFooter();

  // Get listing ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const listingId = urlParams.get('id');

  if (!listingId) {
    showError('No listing ID provided');
    return;
  }

  // Load listing data and render edit form
  loadListingData(listingId);
}

/**
 * Load listing data from API
 */
async function loadListingData(listingId: string): Promise<void> {
  const container = document.getElementById('edit-listing-content');
  if (!container) return;

  // Show loading state
  container.innerHTML = `
    <div class="flex items-center justify-center py-20">
      <div class="text-center">
        <i class="fa-solid fa-spinner fa-spin text-4xl text-slate-400 mb-4"></i>
        <p class="text-slate-600">Loading listing...</p>
      </div>
    </div>
  `;

  try {
    // TODO: Implement API call to fetch listing data
    // const listing = await getListing(listingId);
    // renderEditForm(listing);

    // Placeholder for now
    container.innerHTML = `
      <div class="bg-white p-8" style="border: 3px solid #1e293b">
        <p class="text-slate-600">Edit form will be implemented here for listing ID: ${listingId}</p>
      </div>
    `;
  } catch (error) {
    console.error('Error loading listing:', error);
    showError('Failed to load listing data');
  }
}

/**
 * Show error message
 */
function showError(message: string): void {
  const container = document.getElementById('edit-listing-content');
  if (!container) return;

  container.innerHTML = `
    <div class="bg-white p-8 text-center" style="border: 3px solid #1e293b">
      <i class="fa-solid fa-exclamation-circle text-6xl text-red-300 mb-4"></i>
      <h3 class="font-serif font-bold text-xl text-slate-900 mb-2">Error</h3>
      <p class="text-slate-600 mb-4">${message}</p>
      <button
        onclick="window.history.back()"
        class="bg-slate-900 text-white px-6 py-3 hover:bg-slate-800 transition-colors"
        style="border: 2px solid #1e293b"
      >
        Go Back
      </button>
    </div>
  `;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initListingEditPage);
} else {
  initListingEditPage();
}
