import { renderHeader } from '../components/navbar';
import { renderFooter } from '../components/Footer';
import { renderBreadcrumbInContainer, BREADCRUMB_PRESETS } from '../components/Breadcrumb';
import { protectedRoute, requireOwnership } from '../utils/auth';
import { getListing, updateListing, deleteListing } from '../api/listings';
import { toast } from '../components/Toast';
import { logError } from '../utils/logger';
import { getErrorMessage } from '../utils/errorHandling';
import type { Listing, UpdateListingData } from '../types/api';

let currentListing: Listing | null = null;

/**
 * Initialize listing edit page
 */
export async function initListingEditPage(): Promise<void> {
  // Render header and footer
  await renderHeader();
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
  await loadListingData(listingId);
}

/**
 * Load listing data from API
 */
async function loadListingData(listingId: string): Promise<void> {
  const container = document.getElementById('edit-listing-content');
  if (!container) return;

  try {
    // Fetch listing data from API
    const response = await getListing(listingId);
    currentListing = response.data;

    // Check ownership before allowing edit
    if (currentListing.seller && !requireOwnership(currentListing.seller.name)) {
      return;
    }

    // Check if listing has bids
    const hasBids = !!(currentListing._count && currentListing._count.bids > 0);

    // Render breadcrumb
    renderBreadcrumbInContainer({
      containerId: 'breadcrumb-nav',
      items: BREADCRUMB_PRESETS.listingEdit(currentListing.title),
    });

    // Render the edit form
    renderEditForm(currentListing, hasBids);

    // Initialize event listeners
    initializeFormListeners(listingId, hasBids);
    initializePreview();
    initializeDeleteModal(listingId);
  } catch (error) {
    console.error('Error loading listing:', error);
    showError('Failed to load listing data. The listing may not exist or you may not have permission to edit it.');
  }
}

/**
 * Render the edit form with listing data
 */
function renderEditForm(listing: Listing, hasBids: boolean): void {
  const container = document.getElementById('edit-listing-content');
  if (!container) return;

  // Format the end date for datetime-local input
  const endsAt = new Date(listing.endsAt);
  const formattedDate = endsAt.toISOString().slice(0, 16);

  // Extract image URLs from media array
  const imageUrls = listing.media?.map(m => m.url).join('\n') || '';

  // Extract tags
  const tags = listing.tags?.join(', ') || '';

  container.innerHTML = `
    <div class="bg-white p-10" style="border: 3px solid #1e293b">
      <!-- HEADER -->
      <div class="mb-10 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="h-0.5 w-14 bg-red-700"></div>
          <h1 class="text-[12px] font-bold tracking-[0.18em] uppercase text-slate-500">
            Edit listing
          </h1>
        </div>

        <a
          href="/profile.html"
          class="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-700 hover:text-slate-900"
        >
          Back to profile
        </a>
      </div>

      <!-- INFORMATIONAL BANNER -->
      <div class="mb-10 bg-slate-50 border-2 border-slate-300 p-6">
        <div class="flex items-start gap-4">
          <i class="fa-solid fa-pen-to-square text-2xl text-blue-600 flex-shrink-0"></i>
          <div>
            <h3 class="text-lg font-bold text-slate-900 mb-2">
              Editing Your Listing
            </h3>
            <p class="text-sm text-slate-700 leading-relaxed">
              Update your listing details to attract more bidders. Any changes will be reflected immediately.
              Preview your updates on the right before saving. ${hasBids ? '<strong class="text-red-700">Note: This listing has active bids. Some fields may be restricted.</strong>' : ''}
            </p>
          </div>
        </div>
      </div>

      <!-- GRID -->
      <div class="grid lg:grid-cols-[2fr,1.4fr] gap-12">
        <!-- FORM -->
        <form id="editForm" class="space-y-8">
          <!-- TITLE -->
          <div>
            <label
              class="block mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600"
            >
              Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value="${listing.title}"
              class="w-full px-4 py-3 bg-white border-2 border-slate-800 text-sm focus:outline-none focus:border-red-700"
              required
              ${hasBids ? 'disabled' : ''}
            />
            ${hasBids ? '<p class="mt-2 text-xs text-red-600">Cannot edit title when listing has bids</p>' : ''}
          </div>

          <!-- DESCRIPTION -->
          <div>
            <label
              class="block mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600"
            >
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              rows="6"
              class="w-full px-4 py-3 bg-white border-2 border-slate-800 text-sm focus:outline-none focus:border-red-700"
              required
            >${listing.description || ''}</textarea>
          </div>

          <!-- IMAGES -->
          <div>
            <label
              class="block mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600"
            >
              Image URLs
            </label>
            <textarea
              id="imageUrls"
              name="media"
              rows="4"
              class="w-full px-4 py-3 bg-white border-2 border-slate-800 text-sm focus:outline-none focus:border-red-700"
            >${imageUrls}</textarea>
            <p class="mt-2 text-xs text-slate-500">
              Enter one image URL per line. Images will preview on the right.
            </p>
          </div>

          <!-- TAGS -->
          <div>
            <label
              class="block mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600"
            >
              Tags (Optional)
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value="${tags}"
              placeholder="e.g., vintage, tech, collectible"
              class="w-full px-4 py-3 bg-white border-2 border-slate-800 text-sm focus:outline-none focus:border-red-700"
            />
            <p class="mt-2 text-xs text-slate-500">
              Separate tags with commas
            </p>
          </div>

          <!-- END DATE -->
          <div>
            <label
              class="block mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600"
            >
              End date *
            </label>
            <input
              type="datetime-local"
              id="endDate"
              name="endsAt"
              value="${formattedDate}"
              class="w-full px-4 py-3 bg-white border-2 border-slate-800 text-sm focus:outline-none focus:border-red-700"
              required
            />
          </div>

          <!-- SAVE BUTTON -->
          <button
            type="submit"
            class="w-full bg-slate-900 text-white py-3 font-bold tracking-[0.18em] uppercase border-2 border-slate-900 hover:bg-slate-800 transition-colors inline-flex items-center justify-center gap-2"
          >
            <i class="fa-solid fa-floppy-disk text-base"></i>
            <span>Save changes</span>
          </button>
        </form>

        <!-- LIVE PREVIEW -->
        <div class="space-y-6">
          <div class="mb-4">
            <div class="flex items-center gap-3 mb-4">
              <div class="h-0.5 w-10 bg-slate-400"></div>
              <span class="text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500">
                Live Preview
              </span>
            </div>
          </div>

          <!-- MAIN PREVIEW -->
          <div
            class="relative h-80 bg-slate-200 border-3 border-slate-900 overflow-hidden"
            style="border: 3px solid #1e293b"
            id="mainPreview"
          >
            ${listing.media?.[0]?.url ? `
              <img
                src="${listing.media[0].url}"
                class="w-full h-full object-cover"
                alt="Preview"
              />
            ` : `
              <div class="w-full h-full flex items-center justify-center text-slate-400">
                <div class="text-center">
                  <i class="fa-solid fa-image text-6xl mb-2 block text-slate-400"></i>
                  <p class="text-sm">No image added yet</p>
                </div>
              </div>
            `}
          </div>

          <!-- PREVIEW INFO -->
          <div class="bg-slate-50 border-2 border-slate-300 p-4">
            <h3 id="previewTitle" class="font-bold text-slate-900 mb-2 text-lg">
              ${listing.title}
            </h3>
            <p id="previewDescription" class="text-sm text-slate-700">
              ${listing.description || 'No description provided.'}
            </p>
            <div class="mt-4 pt-4 border-t border-slate-300">
              <p class="text-xs font-bold uppercase tracking-wider text-slate-500">
                Ends
              </p>
              <p id="previewEndDate" class="text-sm text-slate-700 mt-1">
                ${endsAt.toLocaleString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          <!-- ADDITIONAL IMAGES -->
          <div id="additionalImages" class="grid grid-cols-3 gap-4${listing.media && listing.media.length > 1 ? '' : ' hidden'}">
            ${listing.media?.slice(1, 4).map(media => `
              <div class="bg-white border-2 border-slate-900 overflow-hidden">
                <img
                  src="${media.url}"
                  class="w-full h-24 object-cover"
                  alt="Additional preview"
                />
              </div>
            `).join('') || ''}
          </div>
        </div>
      </div>

      <!-- DANGER ZONE -->
      <div class="mt-16 pt-10 border-t-2 border-slate-200">
        <div class="flex items-center gap-4 mb-6">
          <div class="h-0.5 w-14 bg-red-700"></div>
          <span class="text-[12px] font-bold tracking-[0.18em] uppercase text-red-700">
            Danger Zone
          </span>
        </div>

        <div class="bg-red-50 border-2 border-red-300 p-6">
          <div class="flex items-start justify-between gap-6">
            <div class="flex-1">
              <h3 class="text-lg font-bold text-red-900 mb-2">
                Delete this listing
              </h3>
              <p class="text-sm text-red-800 leading-relaxed mb-4">
                Once you delete a listing, there is no going back. This action cannot be undone.
                All bids and listing data will be permanently removed.
              </p>
              ${hasBids ? `
                <div class="bg-red-100 border border-red-300 p-3 text-xs text-red-800 rounded flex items-start gap-2">
                  <i class="fa-solid fa-triangle-exclamation text-red-700 flex-shrink-0 mt-0.5"></i>
                  <div>
                    <strong>Warning:</strong> This listing currently has
                    <span class="font-bold">${listing._count?.bids || 0} bid${(listing._count?.bids || 0) !== 1 ? 's' : ''}</span>.
                    Deleting it will affect those bidders.
                  </div>
                </div>
              ` : ''}
            </div>
            <button
              type="button"
              id="deleteButton"
              class="inline-flex items-center gap-2 bg-red-700 text-white px-6 py-3 font-bold tracking-[0.18em] uppercase border-2 border-red-700 hover:bg-red-800 transition-colors whitespace-nowrap"
            >
              <i class="fa-solid fa-trash text-base"></i>
              <span>Delete listing</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Initialize form event listeners
 */
function initializeFormListeners(listingId: string, hasBids: boolean): void {
  const form = document.getElementById('editForm') as HTMLFormElement;
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const titleInput = document.getElementById('title') as HTMLInputElement;
    const descriptionInput = document.getElementById('description') as HTMLTextAreaElement;
    const imageUrlsInput = document.getElementById('imageUrls') as HTMLTextAreaElement;
    const tagsInput = document.getElementById('tags') as HTMLInputElement;
    const endDateInput = document.getElementById('endDate') as HTMLInputElement;

    // Validate form
    if (!titleInput.value.trim() || !descriptionInput.value.trim() || !endDateInput.value) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Parse image URLs
    const imageUrls = imageUrlsInput.value
      .split('\n')
      .map(url => url.trim())
      .filter(url => url !== '');

    // Parse tags
    const tags = tagsInput.value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag !== '');

    // Prepare update data
    const updateData: UpdateListingData = {
      description: descriptionInput.value.trim(),
      media: imageUrls.map(url => ({ url, alt: titleInput.value })),
    };

    // Only include title if listing has no bids
    if (!hasBids) {
      updateData.title = titleInput.value.trim();
    }

    // Only include tags if they exist
    if (tags.length > 0) {
      updateData.tags = tags;
    }

    try {
      // Show loading state
      const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
      submitButton.disabled = true;
      submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-base"></i><span>Saving...</span>';

      // Update listing via API
      await updateListing(listingId, updateData);

      // Show success message
      toast.success('Listing updated successfully!');

      // Redirect to listing detail page after a short delay
      setTimeout(() => {
        window.location.href = `/listing.html?id=${listingId}`;
      }, 1500);
    } catch (error: unknown) {
      console.error('Error updating listing:', error);

      // Restore button state
      const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
      submitButton.disabled = false;
      submitButton.innerHTML = '<i class="fa-solid fa-floppy-disk text-base"></i><span>Save changes</span>';

      // Show error message
      logError('Failed to update listing', error, { listingId });
      const errorMessage = getErrorMessage(error, 'Failed to update listing. Please try again.');
      toast.error(errorMessage);
    }
  });
}

/**
 * Initialize live preview updates
 */
function initializePreview(): void {
  const titleInput = document.getElementById('title') as HTMLInputElement;
  const descriptionInput = document.getElementById('description') as HTMLTextAreaElement;
  const imageUrlsInput = document.getElementById('imageUrls') as HTMLTextAreaElement;
  const endDateInput = document.getElementById('endDate') as HTMLInputElement;

  const previewTitle = document.getElementById('previewTitle');
  const previewDescription = document.getElementById('previewDescription');
  const previewEndDate = document.getElementById('previewEndDate');
  const mainPreview = document.getElementById('mainPreview');
  const additionalImages = document.getElementById('additionalImages');

  if (!titleInput || !descriptionInput || !imageUrlsInput || !endDateInput) return;

  // Update title preview
  titleInput.addEventListener('input', (e) => {
    if (previewTitle) {
      previewTitle.textContent = (e.target as HTMLInputElement).value || 'Your listing title';
    }
  });

  // Update description preview
  descriptionInput.addEventListener('input', (e) => {
    if (previewDescription) {
      previewDescription.textContent = (e.target as HTMLTextAreaElement).value || 'Your description will appear here…';
    }
  });

  // Update end date preview
  endDateInput.addEventListener('input', (e) => {
    if (previewEndDate && (e.target as HTMLInputElement).value) {
      const date = new Date((e.target as HTMLInputElement).value);
      previewEndDate.textContent = date.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } else if (previewEndDate) {
      previewEndDate.textContent = 'No end date set';
    }
  });

  // Update image previews
  function updateImagePreviews() {
    if (!mainPreview || !additionalImages) return;

    const urls = imageUrlsInput.value
      .split('\n')
      .map(url => url.trim())
      .filter(url => url !== '');

    if (urls.length > 0) {
      // Main image
      mainPreview.innerHTML = `<img src="${urls[0]}" class="w-full h-full object-cover" alt="Preview" onerror="this.parentElement.innerHTML='<div class=\\'w-full h-full flex items-center justify-center text-slate-400\\'><div class=\\'text-center\\'><i class=\\'fa-solid fa-circle-xmark text-6xl mb-2 block text-red-500\\'></i><p class=\\'text-sm\\'>Invalid image URL</p></div></div>'">`;

      // Additional images
      if (urls.length > 1) {
        additionalImages.classList.remove('hidden');
        additionalImages.innerHTML = urls
          .slice(1, 4)
          .map((url, index) => `
            <div class="bg-white border-2 border-slate-900 overflow-hidden">
              <img src="${url}" class="w-full h-24 object-cover" alt="Additional preview ${index + 1}" onerror="this.parentElement.innerHTML='<div class=\\'w-full h-24 flex items-center justify-center bg-slate-200 text-slate-400\\'><i class=\\'fa-solid fa-circle-xmark text-red-500\\'></i></div>'">
            </div>
          `)
          .join('');
      } else {
        additionalImages.classList.add('hidden');
      }
    } else {
      // Reset to default
      mainPreview.innerHTML = `
        <div class="w-full h-full flex items-center justify-center text-slate-400">
          <div class="text-center">
            <i class="fa-solid fa-image text-6xl mb-2 block text-slate-400"></i>
            <p class="text-sm">No image added yet</p>
          </div>
        </div>
      `;
      additionalImages.classList.add('hidden');
    }
  }

  imageUrlsInput.addEventListener('input', updateImagePreviews);
}

/**
 * Initialize delete modal functionality
 */
function initializeDeleteModal(listingId: string): void {
  const deleteButton = document.getElementById('deleteButton');
  const deleteModal = document.getElementById('deleteModal');
  const cancelDelete = document.getElementById('cancelDelete');
  const confirmDelete = document.getElementById('confirmDelete');

  if (!deleteButton || !deleteModal || !cancelDelete || !confirmDelete) return;

  // Show modal
  deleteButton.addEventListener('click', () => {
    deleteModal.classList.remove('hidden');
  });

  // Hide modal
  cancelDelete.addEventListener('click', () => {
    deleteModal.classList.add('hidden');
  });

  // Confirm deletion
  confirmDelete.addEventListener('click', async () => {
    try {
      // Show loading state
      const deleteBtn = confirmDelete as HTMLButtonElement;
      deleteBtn.disabled = true;
      deleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';

      // Delete listing via API
      await deleteListing(listingId);

      // Show success message
      toast.success('Listing deleted successfully');

      // Redirect to profile page
      setTimeout(() => {
        window.location.href = '/profile.html';
      }, 1500);
    } catch (error: unknown) {
      console.error('Error deleting listing:', error);

      // Restore button state
      const deleteBtn = confirmDelete as HTMLButtonElement;
      deleteBtn.disabled = false;
      deleteBtn.innerHTML = 'Delete Forever';

      // Show error message
      logError('Failed to delete listing', error, { listingId });
      const errorMessage = getErrorMessage(error, 'Failed to delete listing. Please try again.');
      toast.error(errorMessage);

      // Close modal
      deleteModal.classList.add('hidden');
    }
  });

  // Close modal on outside click
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
      deleteModal.classList.add('hidden');
    }
  });
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
