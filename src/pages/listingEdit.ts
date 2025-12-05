import { renderHeader } from '../components/navbar';
import { renderFooter } from '../components/Footer';
import { protectedRoute, requireOwnership } from '../utils/auth';
import { getListing } from '../api/listings';

/**
 * Initialize listing edit page
 */
export function initListingEditPage(): void {
  // Render header and footer
  renderHeader();
  renderFooter();

  // Check authentication first
  if (!protectedRoute()) {
    return;
  }

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
    // Fetch listing data from API
    const response = await getListing(listingId);
    const listing = response.data;

    // Check ownership before allowing edit
    if (listing.seller && !requireOwnership(listing.seller.name)) {
      return;
    }

    // TODO: Implement edit form rendering
    // For now, show placeholder with listing info
    container.innerHTML = `
      <div class="bg-white p-8" style="border: 3px solid #1e293b">
        <h2 class="font-serif font-bold text-2xl text-slate-900 mb-4">Edit Listing</h2>
        <div class="space-y-2 text-slate-600">
          <p><strong>ID:</strong> ${listing.id}</p>
          <p><strong>Title:</strong> ${listing.title}</p>
          <p><strong>Description:</strong> ${listing.description || 'No description'}</p>
          <p class="text-sm text-slate-500 mt-4">Edit form will be implemented here</p>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading listing:', error);
    showError('Failed to load listing data. The listing may not exist or you may not have permission to edit it.');
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
