import { renderHeader } from '../components/Navbar';
import { renderFooter } from '../components/Footer';
import {
  renderBreadcrumbInContainer,
  BREADCRUMB_PRESETS,
} from '../components/Breadcrumb';
import { initListingFormPreview } from '../components/ListingFormPreview';
import { protectedRoute, requireOwnership } from '../utils/auth';
import { trapFocus } from '../utils/focusTrap';
import { getListing, updateListing, deleteListing } from '../api/listings';
import { toast } from '../components/Toast';
import { logError } from '../utils/logger';
import { getErrorMessage } from '../utils/errorHandling';
import type { Listing, UpdateListingData } from '../types/api';
import { escapeHtml } from '../utils/escapeHtml';

let currentListing: Listing | null = null;

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

async function loadListingData(listingId: string): Promise<void> {
  const container = document.getElementById('edit-listing-content');
  if (!container) return;

  try {
    // Fetch listing data from API
    const response = await getListing(listingId);
    currentListing = response.data;

    // Check ownership before allowing edit
    if (
      currentListing.seller &&
      !requireOwnership(currentListing.seller.name)
    ) {
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
    logError('Failed to load listing for edit', error, { listingId });
    showError(
      'Failed to load listing data. The listing may not exist or you may not have permission to edit it.'
    );
  }
}

function renderEditForm(listing: Listing, hasBids: boolean): void {
  const container = document.getElementById('edit-listing-content');
  if (!container) return;

  // Format the end date for datetime-local input
  const endsAt = new Date(listing.endsAt);
  const formattedDate = endsAt.toISOString().slice(0, 16);

  // Extract image URLs from media array
  const imageUrls = listing.media?.map((m) => m.url).join('\n') || '';

  // Extract tags
  const tags = listing.tags?.join(', ') || '';

  container.innerHTML = `
    <div class="bg-white p-10" style="border: 3px solid var(--aucto-border-dark)">
      <!-- HEADER -->
      <div class="mb-10 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="h-0.5 w-14 bg-aucto-red"></div>
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
          <i class="fa-solid fa-pen-to-square text-2xl text-blue-600 flex-shrink-0" aria-hidden="true"></i>
          <div>
            <h2 class="text-lg font-bold text-slate-900 mb-2">
              Editing Your Listing
            </h2>
            <p class="text-sm text-slate-700 leading-relaxed">
              Update your listing details to attract more bidders. Any changes will be reflected immediately.
              Preview your updates on the right before saving. ${hasBids ? '<strong class="text-red-700">Note: This listing has active bids. Some fields may be restricted.</strong>' : ''}
            </p>
          </div>
        </div>
      </div>

      <!-- GRID -->
      <div class="grid grid-cols-1 lg:grid-cols-[2fr,1.4fr] gap-12">
        <!-- FORM -->
        <form id="editForm" class="space-y-8">
          <!-- TITLE -->
          <div>
            <label
              for="title"
              class="block mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600"
            >
              Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value="${escapeHtml(listing.title)}"
              class="w-full px-4 py-3 bg-white border-2 border-slate-800 text-sm focus:outline focus:outline-[3px] focus:outline-aucto-red focus:outline-offset-2 focus:border-red-700"
              required
              ${hasBids ? 'disabled' : ''}
            />
            ${hasBids ? '<p class="mt-2 text-xs text-red-600">Cannot edit title when listing has bids</p>' : ''}
          </div>

          <!-- DESCRIPTION -->
          <div>
            <label
              for="description"
              class="block mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600"
            >
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              rows="6"
              class="w-full px-4 py-3 bg-white border-2 border-slate-800 text-sm focus:outline focus:outline-[3px] focus:outline-aucto-red focus:outline-offset-2 focus:border-red-700"
              required
            >${escapeHtml(listing.description || '')}</textarea>
          </div>

          <!-- IMAGES -->
          <div>
            <label
              for="imageUrls"
              class="block mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600"
            >
              Image URLs
            </label>
            <textarea
              id="imageUrls"
              name="media"
              rows="4"
              class="w-full px-4 py-3 bg-white border-2 border-slate-800 text-sm focus:outline focus:outline-[3px] focus:outline-aucto-red focus:outline-offset-2 focus:border-red-700"
            >${escapeHtml(imageUrls)}</textarea>
            <p class="mt-2 text-xs text-slate-500">
              Enter one image URL per line. Images will preview on the right.
            </p>
          </div>

          <!-- TAGS -->
          <div>
            <label
              for="tags"
              class="block mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600"
            >
              Tags (Optional)
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value="${escapeHtml(tags)}"
              placeholder="e.g., vintage, tech, collectible"
              class="w-full px-4 py-3 bg-white border-2 border-slate-800 text-sm focus:outline focus:outline-[3px] focus:outline-aucto-red focus:outline-offset-2 focus:border-red-700"
            />
            <p class="mt-2 text-xs text-slate-500">
              Separate tags with commas
            </p>
          </div>

          <!-- END DATE -->
          <div>
            <label
              for="endDate"
              class="block mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600"
            >
              End date *
            </label>
            <input
              type="datetime-local"
              id="endDate"
              name="endsAt"
              value="${formattedDate}"
              class="w-full px-4 py-3 bg-white border-2 border-slate-800 text-sm focus:outline focus:outline-[3px] focus:outline-aucto-red focus:outline-offset-2 focus:border-red-700"
              required
            />
          </div>

          <!-- SAVE BUTTON -->
          <button
            type="submit"
            class="w-full bg-slate-900 text-white py-3 font-bold tracking-[0.18em] uppercase border-2 border-slate-900 hover:bg-slate-800 transition-colors inline-flex items-center justify-center gap-2"
          >
            <i class="fa-solid fa-floppy-disk text-base" aria-hidden="true"></i>
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
            style="border: 3px solid var(--aucto-border-dark)"
            id="mainPreview"
          >
            ${
              listing.media?.[0]?.url
                ? `
              <img
                src="${escapeHtml(listing.media[0].url)}"
                class="w-full h-full object-cover"
                alt="Preview"
                loading="lazy"
                decoding="async"
                referrerpolicy="no-referrer"
              />
            `
                : `
              <div class="w-full h-full flex items-center justify-center text-slate-600">
                <div class="text-center">
                  <i class="fa-solid fa-image text-6xl mb-2 block text-slate-400" aria-hidden="true"></i>
                  <p class="text-sm">No image added yet</p>
                </div>
              </div>
            `
            }
          </div>

          <!-- PREVIEW INFO -->
          <div class="bg-slate-50 border-2 border-slate-300 p-4">
            <h3 id="previewTitle" class="font-bold text-slate-900 mb-2 text-lg break-words">
              ${escapeHtml(listing.title)}
            </h3>
            <p id="previewDescription" class="text-sm text-slate-700 break-words">
              ${escapeHtml(listing.description || 'No description provided.')}
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
            ${
              listing.media
                ?.slice(1, 4)
                .map(
                  (media) => `
              <div class="bg-white border-2 border-slate-900 overflow-hidden">
                <img
                  src="${escapeHtml(media.url)}"
                  class="w-full h-24 object-cover"
                  alt="Additional preview"
                  loading="lazy"
                  decoding="async"
                  referrerpolicy="no-referrer"
                />
              </div>
            `
                )
                .join('') || ''
            }
          </div>
        </div>
      </div>

      <!-- DANGER ZONE -->
      <div class="mt-16 pt-10 border-t-2 border-slate-200">
        <div class="flex items-center gap-4 mb-6">
          <div class="h-0.5 w-14 bg-aucto-red"></div>
          <span class="text-[12px] font-bold tracking-[0.18em] uppercase text-red-700">
            Danger Zone
          </span>
        </div>

        <div class="bg-red-50 border-2 border-red-300 p-6">
          <div class="flex flex-col md:flex-row items-start md:justify-between gap-6">
            <div class="min-w-0 flex-1">
              <h3 class="text-lg font-bold text-red-900 mb-2">
                Delete this listing
              </h3>
              <p class="text-sm text-red-800 leading-relaxed mb-4">
                Once you delete a listing, there is no going back. This action cannot be undone.
                All bids and listing data will be permanently removed.
              </p>
              ${
                hasBids
                  ? `
                <div class="bg-red-100 border border-red-300 p-3 text-xs text-red-800 rounded flex items-start gap-2">
                  <i class="fa-solid fa-triangle-exclamation text-red-700 flex-shrink-0 mt-0.5" aria-hidden="true"></i>
                  <div>
                    <strong>Warning:</strong> This listing currently has
                    <span class="font-bold">${listing._count?.bids || 0} bid${(listing._count?.bids || 0) !== 1 ? 's' : ''}</span>.
                    Deleting it will affect those bidders.
                  </div>
                </div>
              `
                  : ''
              }
            </div>
            <button
              type="button"
              id="deleteButton"
              class="inline-flex items-center justify-center gap-2 bg-red-700 text-white px-6 py-3 font-bold tracking-[0.18em] uppercase border-2 border-red-700 hover:bg-red-800 transition-colors w-full md:w-auto md:whitespace-nowrap md:flex-shrink-0"
            >
              <i class="fa-solid fa-trash text-base" aria-hidden="true"></i>
              <span>Delete listing</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function initializeFormListeners(listingId: string, hasBids: boolean): void {
  const form = document.getElementById('editForm') as HTMLFormElement;
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const titleInput = document.getElementById('title') as HTMLInputElement;
    const descriptionInput = document.getElementById(
      'description'
    ) as HTMLTextAreaElement;
    const imageUrlsInput = document.getElementById(
      'imageUrls'
    ) as HTMLTextAreaElement;
    const tagsInput = document.getElementById('tags') as HTMLInputElement;
    const endDateInput = document.getElementById('endDate') as HTMLInputElement;

    // Validate form
    if (
      !titleInput.value.trim() ||
      !descriptionInput.value.trim() ||
      !endDateInput.value
    ) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Parse image URLs
    const imageUrls = imageUrlsInput.value
      .split('\n')
      .map((url) => url.trim())
      .filter((url) => url !== '');

    // Parse tags
    const tags = tagsInput.value
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag !== '');

    // Prepare update data
    const updateData: UpdateListingData = {
      description: descriptionInput.value.trim(),
      media: imageUrls.map((url) => ({ url, alt: titleInput.value })),
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
      const submitButton = form.querySelector(
        'button[type="submit"]'
      ) as HTMLButtonElement;
      submitButton.disabled = true;
      submitButton.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin text-base" aria-hidden="true"></i><span>Saving...</span>';

      // Update listing via API
      await updateListing(listingId, updateData);

      // Show success message
      toast.success('Listing updated successfully!');

      // Redirect to listing detail page after a short delay
      setTimeout(() => {
        window.location.href = `/listing.html?id=${listingId}`;
      }, 1500);
    } catch (error: unknown) {
      // Restore button state
      const submitButton = form.querySelector(
        'button[type="submit"]'
      ) as HTMLButtonElement;
      submitButton.disabled = false;
      submitButton.innerHTML =
        '<i class="fa-solid fa-floppy-disk text-base" aria-hidden="true"></i><span>Save changes</span>';

      logError('Failed to update listing', error, { listingId });
      const errorMessage = getErrorMessage(
        error,
        'Failed to update listing. Please try again.'
      );
      toast.error(errorMessage);
    }
  });
}

function initializePreview(): void {
  initListingFormPreview({
    mediaInputId: 'imageUrls',
    endDateInputId: 'endDate',
  });
}

function initializeDeleteModal(listingId: string): void {
  const deleteButton = document.getElementById('deleteButton');
  const deleteModal = document.getElementById('deleteModal');
  const cancelDelete = document.getElementById('cancelDelete');
  const confirmDelete = document.getElementById('confirmDelete');

  if (!deleteButton || !deleteModal || !cancelDelete || !confirmDelete) return;

  let releaseTrap: (() => void) | null = null;

  const openModal = (): void => {
    deleteModal.classList.remove('hidden');
    deleteModal.classList.add('flex');
    // Cancel, not Delete Forever: the safe choice should be the one under your hands.
    releaseTrap = trapFocus(deleteModal, {
      initialFocus: cancelDelete,
      onClose: () => closeModal(),
    });
  };

  const closeModal = (): void => {
    deleteModal.classList.remove('flex');
    deleteModal.classList.add('hidden');
    releaseTrap?.();
    releaseTrap = null;
  };

  deleteButton.addEventListener('click', openModal);
  cancelDelete.addEventListener('click', closeModal);

  // Confirm deletion
  confirmDelete.addEventListener('click', async () => {
    try {
      // Show loading state
      const deleteBtn = confirmDelete as HTMLButtonElement;
      deleteBtn.disabled = true;
      deleteBtn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Deleting...';

      // Delete listing via API
      await deleteListing(listingId);

      // Show success message
      toast.success('Listing deleted successfully');

      // The dialog deliberately stays open showing "Deleting…" until the redirect, so the trap
      // stays with it. Releasing here would put focus on the delete button *behind* the overlay
      // and let Tab walk the page underneath for the whole 1.5s — the defect the trap exists for.
      // Navigation tears the listener down.

      // Redirect to profile page
      setTimeout(() => {
        window.location.href = '/profile.html';
      }, 1500);
    } catch (error: unknown) {
      // Restore button state
      const deleteBtn = confirmDelete as HTMLButtonElement;
      deleteBtn.disabled = false;
      deleteBtn.innerHTML = 'Delete Forever';

      logError('Failed to delete listing', error, { listingId });
      const errorMessage = getErrorMessage(
        error,
        'Failed to delete listing. Please try again.'
      );
      toast.error(errorMessage);

      closeModal();
    }
  });

  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
      closeModal();
    }
  });
}

function showError(message: string): void {
  const container = document.getElementById('edit-listing-content');
  if (!container) return;

  container.innerHTML = `
    <div class="bg-white p-8 text-center" style="border: 3px solid var(--aucto-border-dark)">
      <i class="fa-solid fa-exclamation-circle text-6xl text-red-300 mb-4" aria-hidden="true"></i>
      <h3 class="font-serif font-bold text-xl text-slate-900 mb-2">Error</h3>
      <p class="text-slate-600 mb-4">${message}</p>
      <button
        onclick="window.history.back()"
        class="bg-slate-900 text-white px-6 py-3 hover:bg-slate-800 transition-colors"
        style="border: 2px solid var(--aucto-border-dark)"
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
