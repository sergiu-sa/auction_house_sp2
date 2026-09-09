/**
 * SearchField Component
 * Reusable search input field that dispatches globalSearchInput event
 */

import { escapeHtml } from '../../utils/escapeHtml';

export interface SearchFieldConfig {
  id: string;
  placeholder?: string;
  initialValue?: string;
  variant?: 'normal' | 'compact';
  /**
   * Accessible name.
   * The placeholder cannot be it:
   *   it disappears the moment the reader types, and axe accepts a placeholder as a name, so nothing in the suite would report its absence.
   */
  label?: string;
}

/**
 * Generate HTML for search field
 */
export function renderSearchField(config: SearchFieldConfig): string {
  const {
    id,
    placeholder = 'Search auctions...',
    initialValue = '',
    variant = 'normal',
    label = 'Search auctions',
  } = config;

  const inputClasses =
    variant === 'compact'
      ? 'w-full bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline focus:outline-[3px] focus:outline-aucto-red focus:outline-offset-2'
      : 'w-full bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline focus:outline-[3px] focus:outline-aucto-red focus:outline-offset-2';

  return `
    <div class="relative flex-1">
      <input
        id="${id}"
        type="search"
        aria-label="${escapeHtml(label)}"
        placeholder="${escapeHtml(placeholder)}"
        value="${escapeHtml(initialValue)}"
        class="${inputClasses}"
        style="border: 2px solid var(--aucto-border-mid)"
      />
      <i class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 fa-solid fa-magnifying-glass text-sm text-slate-400" aria-hidden="true"></i>
    </div>
  `;
}

/**
 * Initialize search field event listeners
 */
/** Pending debounces by field id, so an explicit reset can cancel one it did not start. */
const pendingSearches = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Drop keystrokes that have not been dispatched yet.
 *
 * For an explicit reset only;
 *    clearing the filters makes a half-typed term stale, and without this the debounce fires after the reset and puts the search straight back.
 */
export function cancelSearchFieldDebounce(id: string): void {
  const pending = pendingSearches.get(id);
  if (pending !== undefined) clearTimeout(pending);
  pendingSearches.delete(id);

  const searchInput = document.getElementById(id);
  if (searchInput) delete searchInput.dataset.searchPending;
}

export function initSearchField(id: string, debounceMs: number = 300): void {
  const searchInput = document.getElementById(id) as HTMLInputElement;
  if (!searchInput) return;

  searchInput.addEventListener('input', () => {
    cancelSearchFieldDebounce(id);
    // Marks the field as holding keystrokes that have not been dispatched yet, so anything repainting it from state can tell "the reader is between letters" from "the reader is done".
    // A focus check alone does not:
    //   clicking a filter moves focus away while the debounce is still pending, and the repaint then overwrites the half-typed term.
    searchInput.dataset.searchPending = 'true';
    pendingSearches.set(
      id,
      setTimeout(() => {
        pendingSearches.delete(id);
        delete searchInput.dataset.searchPending;
        const query = searchInput.value.trim();
        document.dispatchEvent(
          new CustomEvent('globalSearchInput', {
            detail: { query },
          })
        );
      }, debounceMs)
    );
  });
}

/**
 * Get current value of search field
 */
export function getSearchFieldValue(id: string): string {
  const searchInput = document.getElementById(id) as HTMLInputElement;
  return searchInput ? searchInput.value : '';
}

/**
 * Set value of search field
 */
export function setSearchFieldValue(id: string, value: string): void {
  const searchInput = document.getElementById(id) as HTMLInputElement;
  if (searchInput) {
    searchInput.value = value;
  }
}
