import { renderHeader } from '../components/navbar';
import { renderFooter } from '../components/Footer';

/**
 * Initialize listing create page
 */
export function initListingCreatePage(): void {
  // Render header and footer
  renderHeader();
  renderFooter();

  // Render the create listing form
  renderCreateForm();
}

/**
 * Render the create listing form
 */
function renderCreateForm(): void {
  const container = document.getElementById('create-listing-content');
  if (!container) return;

  container.innerHTML = `
    <div class="bg-white p-8" style="border: 3px solid #1e293b">
      <form id="create-listing-form" class="space-y-6">
        <!-- Form fields will be implemented here -->
        <div>
          <label for="title" class="block mb-2 text-sm font-bold text-slate-900">
            Listing Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            placeholder="Enter a descriptive title"
            class="w-full px-4 py-3 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none"
            style="border: 2px solid #334155"
            required
          />
        </div>

        <div>
          <label for="description" class="block mb-2 text-sm font-bold text-slate-900">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows="6"
            placeholder="Describe your item in detail"
            class="w-full px-4 py-3 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none"
            style="border: 2px solid #334155"
            required
          ></textarea>
        </div>

        <div>
          <label for="endsAt" class="block mb-2 text-sm font-bold text-slate-900">
            Auction End Date
          </label>
          <input
            type="datetime-local"
            id="endsAt"
            name="endsAt"
            class="w-full px-4 py-3 text-sm bg-white text-slate-900 focus:outline-none"
            style="border: 2px solid #334155"
            required
          />
        </div>

        <div class="flex gap-4">
          <button
            type="submit"
            class="flex-1 bg-slate-900 text-white px-6 py-3 text-sm font-bold tracking-wide hover:bg-slate-800 transition-colors inline-flex items-center justify-center gap-2"
            style="border: 3px solid #1e293b"
          >
            <i class="fa-solid fa-plus"></i>
            Create Listing
          </button>
          <button
            type="button"
            onclick="window.history.back()"
            class="bg-white text-slate-900 px-6 py-3 text-sm font-bold tracking-wide hover:bg-slate-50 transition-colors"
            style="border: 2px solid #334155"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  `;

  // Add form submit handler
  const form = document.getElementById('create-listing-form');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
}

/**
 * Handle form submission
 */
async function handleFormSubmit(event: Event): Promise<void> {
  event.preventDefault();

  const form = event.target as HTMLFormElement;
  const formData = new FormData(form);

  console.log('Form data:', Object.fromEntries(formData.entries()));

  // TODO: Implement API call to create listing
  // await createListing(data);

  alert('Create listing functionality will be implemented');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initListingCreatePage);
} else {
  initListingCreatePage();
}
