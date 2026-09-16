/**
 * SortDropdown Component
 * Reusable sort dropdown that dispatches sortChange event
 */

import { escapeHtml } from '../../utils/escapeHtml';

export interface SortDropdownConfig {
  id: string;
  defaultValue?: string;
  /** Accessible name. The visible arrow is decorative, so the select has no visible label. */
  label?: string;
}

export interface SortOption {
  value: string;
  label: string;
  sort: string;
  order: 'asc' | 'desc';
}

/** Exported so `SortDropdown.test.ts` can pin it against `SORT_PRESETS`, which the URL parses against. */
export const SORT_OPTIONS: SortOption[] = [
  {
    value: 'created-desc',
    label: 'Newest first',
    sort: 'created',
    order: 'desc',
  },
  {
    value: 'created-asc',
    label: 'Oldest first',
    sort: 'created',
    order: 'asc',
  },
  { value: 'endsAt-asc', label: 'Ending soon', sort: 'endsAt', order: 'asc' },
  { value: 'title-asc', label: 'Title (A-Z)', sort: 'title', order: 'asc' },
  { value: 'title-desc', label: 'Title (Z-A)', sort: 'title', order: 'desc' },
];

/**
 * Generate HTML for sort dropdown
 */
export function renderSortDropdown(config: SortDropdownConfig): string {
  const { id, defaultValue = 'created-desc', label = 'Sort listings' } = config;

  const selectClasses =
    'bg-white px-3 py-1.5 pr-7 text-[10px] font-bold tracking-[0.18em] uppercase text-slate-700 hover:bg-slate-50 focus:outline focus:outline-[3px] focus:outline-aucto-red focus:outline-offset-2 appearance-none';

  const arrowSize =
    'border-left: 3px solid transparent; border-right: 3px solid transparent; border-top: 5px solid #64748b;';

  const arrowPosition = 'right-2';

  return `
    <div class="relative">
      <select
        id="${id}"
        aria-label="${escapeHtml(label)}"
        class="${selectClasses}"
        style="border: 2px solid var(--aucto-border-mid)"
      >
        ${SORT_OPTIONS.map(
          (option) => `
          <option value="${option.value}" ${option.value === defaultValue ? 'selected' : ''}>
            ${option.label}
          </option>
        `
        ).join('')}
      </select>
      <div class="pointer-events-none absolute ${arrowPosition} top-1/2 -translate-y-1/2">
        <div class="h-0 w-0" style="${arrowSize}"></div>
      </div>
    </div>
  `;
}

/**
 * Initialize sort dropdown event listener
 */
export function initSortDropdown(id: string): void {
  const select = document.getElementById(id) as HTMLSelectElement;
  if (!select) return;

  select.addEventListener('change', () => {
    const value = select.value;
    const [sort, order] = value.split('-');

    document.dispatchEvent(
      new CustomEvent('sortChange', {
        detail: { sort, order },
      })
    );
  });
}

/**
 * Set sort value
 */
export function setSortValue(id: string, sort: string, order: string): void {
  const select = document.getElementById(id) as HTMLSelectElement;
  if (select) {
    select.value = `${sort}-${order}`;
  }
}
