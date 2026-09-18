import { renderHeader } from '../components/Navbar';
import { renderFooter } from '../components/Footer';
import {
  renderBreadcrumbInContainer,
  BREADCRUMB_PRESETS,
} from '../components/Breadcrumb';
import { initListingFormPreview } from '../components/ListingFormPreview';
import { renderListingForm, LISTING_FORM_ID } from '../components/ListingForm';
import { createListing } from '../api/listings';
import { protectedRoute } from '../utils/auth';
import { toast } from '../components/Toast';
import { logError } from '../utils/logger';
import { setButtonBusy } from '../utils/busyButton';
import { getErrorMessage } from '../utils/errorHandling';
import {
  parseMediaUrls,
  parseTags,
  toDateTimeLocal,
} from '../utils/listingForm';
import type { CreateListingData } from '../types/api';

export function initListingCreatePage(): void {
  // Render header and footer
  renderHeader();
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

  container.innerHTML = renderListingForm({
    heading: 'Create new listing',
    banner: {
      icon: 'fa-circle-info',
      title: 'Creating Your Listing',
      body: `Add a clear title, detailed description, and quality images to attract bidders.
             Set an end date for your auction. You can add multiple images by entering one URL per line.
             Preview your listing before publishing.`,
    },
    columns: 'lg:grid-cols-[1.5fr,1fr]',
    title: { placeholder: 'e.g., Vintage camera set' },
    description: {
      placeholder:
        'Describe the condition, features, and any important notes about your item…',
    },
    media: {
      placeholder:
        'https://example.com/image1.jpg\nhttps://example.com/image2.jpg\nhttps://example.com/image3.jpg',
    },
    tags: { placeholder: 'e.g., vintage, camera, photography' },
    endsAt: {},
    submit: { icon: 'fa-paper-plane', label: 'Publish listing' },
    preview: {
      title: 'Your listing title',
      description: 'Your description will appear here…',
      endDate: 'No end date set',
    },
  });

  // Initialize form handlers
  initFormHandlers();
}

function initFormHandlers(): void {
  const form = document.getElementById(LISTING_FORM_ID) as HTMLFormElement;
  const endDateInput = document.getElementById('endsAt') as HTMLInputElement;

  // Earliest allowed end date is one hour from now.
  if (endDateInput) {
    const minDate = new Date();
    minDate.setHours(minDate.getHours() + 1);
    endDateInput.min = toDateTimeLocal(minDate);
  }

  initListingFormPreview();

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

  const restore = setButtonBusy(submitBtn, 'Creating...');

  try {
    // Get form data
    const formData = new FormData(form);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const mediaUrls = parseMediaUrls(formData.get('media') as string).map(
      (url) => ({ url, alt: '' })
    );
    const tags = parseTags(formData.get('tags') as string);
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

    restore();
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initListingCreatePage);
} else {
  initListingCreatePage();
}
