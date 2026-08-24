import { renderHeader } from '../components/Navbar';
import { renderFooter } from '../components/Footer';
import {
  renderBreadcrumbInContainer,
  BREADCRUMB_PRESETS,
} from '../components/Breadcrumb';
import { initListingFormPreview } from '../components/ListingFormPreview';
import { createListing } from '../api/listings';
import { protectedRoute } from '../utils/auth';
import { toast } from '../components/Toast';
import { logError } from '../utils/logger';
import { getErrorMessage } from '../utils/errorHandling';
import type { CreateListingData } from '../types/api';

export async function initListingCreatePage(): Promise<void> {
  // Render header and footer
  await renderHeader();
  renderFooter();

  // Check if user is logged in and redirect if not
  if (!protectedRoute()) {
    return;
  }

  // Render breadcrumb
  renderBreadcrumbInContainer({
    containerId: 'breadcrumb-nav',
    items: BREADCRUMB_PRESETS.listingCreate(),
  });

  // Render the create listing form
  renderCreateForm();
}

function renderCreateForm(): void {
  const container = document.getElementById('create-listing-content');
  if (!container) return;

  container.innerHTML = `
    <div class="bg-white p-6 md:p-10" style="border: 3px solid var(--aucto-border-dark)">
      <!-- Header -->
      <div class="mb-8 md:mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="h-0.5 w-14 bg-aucto-red"></div>
          <h1 class="text-[12px] font-bold tracking-[0.18em] uppercase text-slate-500">
            Create new listing
          </h1>
        </div>

        <a
          href="/profile.html"
          class="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-700 hover:text-slate-900 inline-flex items-center gap-2"
        >
          <i class="fa-solid fa-arrow-left text-xs"></i>
          <span>Back to profile</span>
        </a>
      </div>

      <!-- Info Banner -->
      <div class="mb-8 md:mb-10 bg-slate-50 border-2 border-slate-300 p-4 md:p-6">
        <div class="flex items-start gap-4">
          <i class="fa-solid fa-circle-info text-xl md:text-2xl text-blue-600 flex-shrink-0"></i>
          <div>
            <h3 class="text-base md:text-lg font-bold text-slate-900 mb-2">
              Creating Your Listing
            </h3>
            <p class="text-sm text-slate-700 leading-relaxed">
              Add a clear title, detailed description, and quality images to attract bidders.
              Set an end date for your auction. You can add multiple images by entering one URL per line.
              Preview your listing before publishing.
            </p>
          </div>
        </div>
      </div>

      <!-- Form and Preview Grid -->
      <div class="grid lg:grid-cols-[1.5fr,1fr] gap-8 md:gap-12">
        <!-- Form -->
        <form id="create-listing-form" class="space-y-6 md:space-y-8">
          <!-- Title -->
          <div>
            <label for="title" class="block mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
              Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              placeholder="e.g., Vintage camera set"
              class="w-full px-4 py-3 bg-white border-2 border-slate-800 text-sm focus:outline focus:outline-[3px] focus:outline-aucto-red focus:outline-offset-2 focus:border-red-700"
              required
            />
          </div>

          <!-- Description -->
          <div>
            <label for="description" class="block mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              rows="6"
              placeholder="Describe the condition, features, and any important notes about your item…"
              class="w-full px-4 py-3 bg-white border-2 border-slate-800 text-sm focus:outline focus:outline-[3px] focus:outline-aucto-red focus:outline-offset-2 focus:border-red-700 resize-none"
              required
            ></textarea>
          </div>

          <!-- Image URLs -->
          <div>
            <label for="media" class="block mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
              Image URLs
            </label>
            <textarea
              id="media"
              name="media"
              rows="4"
              placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg&#10;https://example.com/image3.jpg"
              class="w-full px-4 py-3 bg-white border-2 border-slate-800 text-sm focus:outline focus:outline-[3px] focus:outline-aucto-red focus:outline-offset-2 focus:border-red-700 resize-none"
            ></textarea>
            <p class="mt-2 text-xs text-slate-500">
              Enter one image URL per line. Images will preview on the right.
            </p>
          </div>

          <!-- Tags (Optional) -->
          <div>
            <label for="tags" class="block mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
              Tags (Optional)
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              placeholder="e.g., vintage, camera, photography"
              class="w-full px-4 py-3 bg-white border-2 border-slate-800 text-sm focus:outline focus:outline-[3px] focus:outline-aucto-red focus:outline-offset-2 focus:border-red-700"
            />
            <p class="mt-2 text-xs text-slate-500">
              Separate tags with commas
            </p>
          </div>

          <!-- End Date -->
          <div>
            <label for="endsAt" class="block mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
              End date *
            </label>
            <input
              type="datetime-local"
              id="endsAt"
              name="endsAt"
              class="w-full px-4 py-3 bg-white border-2 border-slate-800 text-sm focus:outline focus:outline-[3px] focus:outline-aucto-red focus:outline-offset-2 focus:border-red-700"
              required
            />
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            class="w-full bg-slate-900 text-white py-3 px-4 font-bold text-sm tracking-[0.18em] uppercase border-2 border-slate-900 hover:bg-slate-800 transition-colors inline-flex items-center justify-center gap-2"
          >
            <i class="fa-solid fa-paper-plane text-base"></i>
            <span>Publish listing</span>
          </button>
        </form>

        <!-- Live Preview -->
        <div class="space-y-6">
          <div class="mb-4">
            <div class="flex items-center gap-3 mb-4">
              <div class="h-0.5 w-10 bg-slate-400"></div>
              <span class="text-[11px] font-bold tracking-[0.18em] uppercase text-slate-500">
                Live Preview
              </span>
            </div>
          </div>

          <!-- Main Preview Image -->
          <div
            class="relative h-64 md:h-80 bg-slate-200 overflow-hidden"
            style="border: 3px solid var(--aucto-border-dark)"
            id="mainPreview"
          >
            <div class="w-full h-full flex items-center justify-center text-slate-400">
              <div class="text-center">
                <i class="fa-solid fa-image text-5xl md:text-6xl mb-2 block text-slate-400"></i>
                <p class="text-sm">No image added yet</p>
              </div>
            </div>
          </div>

          <!-- Preview Info Card -->
          <div class="bg-slate-50 border-2 border-slate-300 p-4">
            <h3 id="previewTitle" class="font-bold text-slate-900 mb-2 text-base md:text-lg">
              Your listing title
            </h3>
            <p id="previewDescription" class="text-sm text-slate-700">
              Your description will appear here…
            </p>
            <div class="mt-4 pt-4 border-t border-slate-300">
              <p class="text-xs font-bold uppercase tracking-wider text-slate-500">
                Ends
              </p>
              <p id="previewEndDate" class="text-sm text-slate-700 mt-1">
                No end date set
              </p>
            </div>
          </div>

          <!-- Additional Images Preview -->
          <div id="additionalImages" class="hidden">
            <!-- Additional image previews will be inserted here -->
          </div>
        </div>
      </div>
    </div>
  `;

  // Initialize form handlers
  initFormHandlers();
}

function initFormHandlers(): void {
  const form = document.getElementById(
    'create-listing-form'
  ) as HTMLFormElement;
  const endDateInput = document.getElementById('endsAt') as HTMLInputElement;

  // Earliest allowed end date is one hour from now.
  if (endDateInput) {
    const minDate = new Date();
    minDate.setHours(minDate.getHours() + 1);
    endDateInput.min = minDate.toISOString().slice(0, 16);
  }

  initListingFormPreview({ mediaInputId: 'media', endDateInputId: 'endsAt' });

  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
}

async function handleFormSubmit(event: Event): Promise<void> {
  event.preventDefault();

  const form = event.target as HTMLFormElement;
  const submitBtn = form.querySelector(
    'button[type="submit"]'
  ) as HTMLButtonElement;

  // Disable submit button
  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <i class="fa-solid fa-spinner fa-spin text-base"></i>
    <span>Creating...</span>
  `;

  try {
    // Get form data
    const formData = new FormData(form);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const mediaUrls = (formData.get('media') as string)
      .split('\n')
      .map((url) => url.trim())
      .filter((url) => url !== '')
      .map((url) => ({ url, alt: '' }));
    const tagsInput = formData.get('tags') as string;
    const tags = tagsInput
      ? tagsInput
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag !== '')
      : [];
    const endsAt = new Date(formData.get('endsAt') as string).toISOString();

    // Validate end date
    const now = new Date();
    const endDate = new Date(endsAt);
    if (endDate <= now) {
      throw new Error('End date must be in the future');
    }

    // Prepare listing data
    const listingData: CreateListingData = {
      title,
      description,
      media: mediaUrls.length > 0 ? mediaUrls : undefined,
      tags: tags.length > 0 ? tags : undefined,
      endsAt,
    };

    // Create listing
    const response = await createListing(listingData);

    // Redirect to the created listing
    window.location.href = `/listing.html?id=${response.data.id}`;
  } catch (error) {
    logError('Failed to create listing', error);
    toast.error(
      getErrorMessage(error, 'Failed to create listing. Please try again.')
    );

    // Re-enable submit button
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <i class="fa-solid fa-paper-plane text-base"></i>
      <span>Publish listing</span>
    `;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initListingCreatePage);
} else {
  initListingCreatePage();
}
