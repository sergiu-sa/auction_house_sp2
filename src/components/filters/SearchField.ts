/**
 * SearchField Component
 * Reusable search input field that dispatches globalSearchInput event
 */

export interface SearchFieldConfig {
  id: string;
  placeholder?: string;
  initialValue?: string;
  variant?: 'normal' | 'compact';
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
        placeholder="${placeholder}"
        value="${initialValue}"
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
export function initSearchField(id: string, debounceMs: number = 300): void {
  const searchInput = document.getElementById(id) as HTMLInputElement;
  if (!searchInput) return;

  let searchTimeout: ReturnType<typeof setTimeout>;

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const query = searchInput.value.trim();
      document.dispatchEvent(
        new CustomEvent('globalSearchInput', {
          detail: { query },
        })
      );
    }, debounceMs);
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
