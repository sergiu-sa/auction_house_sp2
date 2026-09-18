import { renderHeader } from '../components/Navbar';
import { renderFooter } from '../components/Footer';
import {
  renderBreadcrumbInContainer,
  BREADCRUMB_PRESETS,
} from '../components/Breadcrumb';
import { initListingFormPreview } from '../components/ListingFormPreview';
import { renderListingForm, LISTING_FORM_ID } from '../components/ListingForm';
import { protectedRoute, requireOwnership } from '../utils/auth';
import { trapFocus } from '../utils/focusTrap';
import { getListing, updateListing, deleteListing } from '../api/listings';
import { toast } from '../components/Toast';
import { logError } from '../utils/logger';
import { setButtonBusy } from '../utils/busyButton';
import { getErrorMessage } from '../utils/errorHandling';
import {
  formatMediaUrls,
  formatTags,
  parseMediaUrls,
  parseTags,
  toDateTimeLocal,
} from '../utils/listingForm';
import type { Listing, UpdateListingData } from '../types/api';
import { mountErrorPanel } from '../components/ErrorPanel';

let currentListing: Listing | null = null;

export async function initListingEditPage(): Promise<void> {
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

  const endsAt = new Date(listing.endsAt);
  const endsAtIsValid = !Number.isNaN(endsAt.getTime());

  container.innerHTML = renderListingForm({
    heading: 'Edit listing',
    banner: {
      icon: 'fa-pen-to-square',
      title: 'Editing Your Listing',
      body: `Update your listing details to attract more bidders. Any changes will be reflected immediately.
             Preview your updates on the right before saving. ${hasBids ? '<strong class="text-red-700">Note: This listing has active bids. Some fields may be restricted.</strong>' : ''}`,
    },
    columns: 'lg:grid-cols-[2fr,1.4fr]',
    title: {
      value: listing.title,
      disabled: hasBids,
      note: hasBids ? 'Cannot edit title when listing has bids' : undefined,
    },
    description: { value: listing.description || '' },
    media: { value: formatMediaUrls(listing.media) },
    tags: {
      value: formatTags(listing.tags),
      placeholder: 'e.g., vintage, tech, collectible',
    },
    endsAt: {
      value: toDateTimeLocal(endsAt),
      readonly: true,
      hint: 'Fixed when the listing was published and cannot be changed.',
    },
    submit: { icon: 'fa-floppy-disk', label: 'Save changes' },
    preview: {
      title: listing.title,
      description: listing.description || 'No description provided.',
      endDate: endsAtIsValid
        ? endsAt.toLocaleString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })
        : 'No end date set',
      media: listing.media,
    },
    extra: renderDangerZone(listing, hasBids),
  });
}

function renderDangerZone(listing: Listing, hasBids: boolean): string {
  return `
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
  `;
}

function initializeFormListeners(listingId: string, hasBids: boolean): void {
  const form = document.getElementById(LISTING_FORM_ID) as HTMLFormElement;
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const titleInput = document.getElementById('title') as HTMLInputElement;
    const descriptionInput = document.getElementById(
      'description'
    ) as HTMLTextAreaElement;
    const mediaInput = document.getElementById('media') as HTMLTextAreaElement;
    const tagsInput = document.getElementById('tags') as HTMLInputElement;

    // The end date is not here:
    //  PUT /auction/listings/<id> has no endsAt, so the field is read-only and there is nothing for the user to fill in or for us to send.
    if (!titleInput.value.trim() || !descriptionInput.value.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const imageUrls = parseMediaUrls(mediaInput.value);
    const tags = parseTags(tagsInput.value);

    // tags is sent even when empty, so clearing the field removes them.
    // Omitting it on empty made the old ones survive the save and reappear on reload.
    const updateData: UpdateListingData = {
      description: descriptionInput.value.trim(),
      media: imageUrls.map((url) => ({ url, alt: titleInput.value })),
      tags,
    };

    // Only include title if listing has no bids
    if (!hasBids) {
      updateData.title = titleInput.value.trim();
    }

    // Outside the try, so the catch can undo it without re-finding the button and retyping its
    // label — which is what it used to do, in markup that had to be kept in step by hand.
    const submitButton = form.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;
    const restore = setButtonBusy(submitButton, 'Saving...');

    try {
      // Update listing via API
      await updateListing(listingId, updateData);

      // Show success message
      toast.success('Listing updated successfully!');

      // Redirect to listing detail page after a short delay
      setTimeout(() => {
        window.location.href = `/listing.html?id=${listingId}`;
      }, 1500);
    } catch (error: unknown) {
      restore();

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
  // The end date is read-only here, so it never fires `input` and the preview's listener for it
  // never runs. #previewEndDate is painted at render time instead.
  initListingFormPreview();
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
    const restore = setButtonBusy(
      confirmDelete as HTMLButtonElement,
      'Deleting...'
    );

    try {
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
      restore();

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
  mountErrorPanel(document.getElementById('edit-listing-content'), {
    message,
    action: { label: 'Go Back', onClick: () => window.history.back() },
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initListingEditPage);
} else {
  initListingEditPage();
}
