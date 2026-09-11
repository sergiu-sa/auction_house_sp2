/**
 * The catalog's filter affordance, shared by Home and Collection.
 *
 * Collapsed to a single row below `lg` and expanded on request.
 * The 251px this replaced was not too tall because the filter set is large;
 * it was too tall because it arrived uninvited, on scroll, over 44% of a 320px screen.
 *
 * It dispatches the four events `CatalogStateManager` already listens for, so the state layer needs no knowledge of it.
 */

import {
  renderSearchField,
  initSearchField,
  setSearchFieldValue,
  cancelSearchFieldDebounce,
  renderCategoryFilters,
  initCategoryFilters,
  setActiveCategory,
  renderActiveOnlyCheckbox,
  initActiveOnlyCheckbox,
  setActiveOnlyState,
  renderSortDropdown,
  initSortDropdown,
  setSortValue,
} from './index';
import type { CatalogFilterState } from '../../utils/catalogState';
import { formatCount } from '../../utils/formatCurrency';

export const CATALOG_FILTER_IDS = {
  search: 'catalog-search-input',
  category: 'data-catalog-filter',
  activeOnly: 'catalog-active-only',
  sort: 'catalog-sort-select',
} as const;

/** Filters only. Page, page size and view mode are not things the reader filtered by. */
export function countActiveFilters(
  state: CatalogFilterState,
  defaults: CatalogFilterState
): number {
  let count = 0;
  if (state.category !== defaults.category) count += 1;
  if (state.search.trim() !== defaults.search.trim()) count += 1;
  if (state.activeOnly !== defaults.activeOnly) count += 1;
  if (state.sort !== defaults.sort || state.sortOrder !== defaults.sortOrder)
    count += 1;
  return count;
}

/**
 * `role="search"` sits on the whole bar, not on the input.
 *
 * The app's two search landmarks were deleted with the navbar variant that carried them, and this bar never had one, so no page had a search region a reader could jump to.
 * ARIA's search landmark is the set of controls that together make a search facility:
 *  the field, the toggle, and the category/active-only/sort controls in the panel;
 *  so marking the bare field would land the reader beside them, and would make a landmark of every future call site of a reusable component.
 *
 * `role="search"` rather than `<search>`: that element shipped in Safari 17 and Chrome 118, well past this build's Safari 14 / Chrome 90 target.
 */
export function renderCatalogFilterBar(): string {
  return `
    <div
      id="catalog-filter-bar"
      data-expanded="false"
      role="search"
      aria-label="Search and filter the catalog"
      class="sticky top-0 z-30 mb-8"
    >
      <div class="bg-warm-white px-4 py-3 md:px-6" style="border: 3px solid var(--aucto-border-dark)">
        <div class="flex items-center gap-3">
          <!--
            Search sits in the always-visible row rather than inside the collapsed panel.
            Hiding it behind a control labelled "Filters" is the one thing a reader will not
            think to open, and it is the primary action on a catalog page - filters are the
            refinement, so those are what go behind the button.
          -->
          <div class="min-w-0 flex-1 lg:max-w-md">
            ${renderSearchField({ id: CATALOG_FILTER_IDS.search, placeholder: 'Search catalog...', variant: 'compact', label: 'Search the catalog' })}
          </div>

          <button
            id="catalog-filters-toggle"
            type="button"
            class="inline-flex flex-shrink-0 items-center gap-2 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-900 hover:bg-slate-50"
            style="border: 2px solid var(--aucto-border-mid)"
            aria-expanded="false"
            aria-controls="catalog-filters-panel"
            aria-label="Filters"
          >
            <i class="fa-solid fa-sliders text-sm" aria-hidden="true"></i>
            <span
              id="catalog-filters-count"
              class="inline-flex h-5 min-w-[1.25rem] items-center justify-center bg-slate-900 px-1 text-[10px] text-white"
              hidden
            ></span>
          </button>

          <p id="catalog-filters-summary" class="ml-auto min-w-0 truncate text-xs font-bold uppercase tracking-[0.14em] text-slate-600"></p>
        </div>

        <div id="catalog-filters-panel" class="mt-4 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
            ${renderCategoryFilters({ dataAttribute: CATALOG_FILTER_IDS.category, variant: 'compact' })}
            <div class="flex flex-wrap items-center gap-3 text-sm">
              ${renderActiveOnlyCheckbox({ id: CATALOG_FILTER_IDS.activeOnly, variant: 'compact' })}
              ${renderSortDropdown({ id: CATALOG_FILTER_IDS.sort, variant: 'compact', label: 'Sort listings' })}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function setExpanded(expanded: boolean): void {
  const bar = document.getElementById('catalog-filter-bar');
  const toggle = document.getElementById('catalog-filters-toggle');
  if (!bar || !toggle) return;

  bar.dataset.expanded = String(expanded);
  toggle.setAttribute('aria-expanded', String(expanded));
}

export function initCatalogFilterBar(): void {
  const toggle = document.getElementById('catalog-filters-toggle');
  const bar = document.getElementById('catalog-filter-bar');
  if (!toggle || !bar) return;

  toggle.addEventListener('click', () => {
    setExpanded(bar.dataset.expanded !== 'true');
  });

  // Escape always closes the panel; it only *moves focus* for a reader who was inside it.
  //
  // Splitting those two is what makes this safe.
  // Gating the close on focus as well looked right and was wrong:
  //  a mouse click does not focus a button in WebKit, measured, focus landed on `main-content`, so Escape stopped closing the panel for every Safari mouse user.
  // Gating nothing was also wrong:
  //  the profile menu focuses its own trigger on the same keypress, and moving focus unconditionally pulled it straight back off.
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (bar.dataset.expanded !== 'true') return;

    const panel = document.getElementById('catalog-filters-panel');
    const held =
      document.activeElement === toggle ||
      (!!panel && panel.contains(document.activeElement));

    setExpanded(false);

    // Only when the panel had focus, or this takes it from whatever else Escape just closed.
    // Safe at `lg`, where the toggle is display:
    // none and `data-expanded` may be stale from a narrower width: focus() on a hidden element is a no-op and leaves focus where it is.
    if (held) toggle.focus();
  });

  // Choosing a filter is the end of the interaction the panel exists for.
  // Sort and search are not in this list:
  //  sort is a <select> the reader may compare options in, and search is debounced mid-type.
  bar.querySelectorAll(`[${CATALOG_FILTER_IDS.category}]`).forEach((button) =>
    button.addEventListener('click', () => {
      setExpanded(false);
      // The button that was just pressed is inside the panel, so collapsing it removes the element holding focus and the browser drops focus to <body>;
      //   a keyboard reader who picks a category is thrown back to the skip link.
      // At `lg` nothing collapses and the toggle is hidden, where focus() is a no-op and focus stays on the button.
      toggle.focus();
    })
  );

  initSearchField(CATALOG_FILTER_IDS.search, 300);
  initCategoryFilters(CATALOG_FILTER_IDS.category);
  initActiveOnlyCheckbox(CATALOG_FILTER_IDS.activeOnly);
  initSortDropdown(CATALOG_FILTER_IDS.sort);
}

/**
 * Close the panel from outside,  used before a page change scrolls the grid to the top.
 * The `scroll-margin-top` that keeps the first row clear of the bar is sized for the collapsed bar, and an open panel is far taller than that.
 */
export function collapseCatalogFilterBar(): void {
  setExpanded(false);
}

/**
 * Drop a half-typed search before an explicit reset.
 * Without it the reset repaints the empty field, the debounce fires a moment later reading the term the reader had typed, and the search the reader just cleared comes back.
 */
export function cancelCatalogSearchDebounce(): void {
  cancelSearchFieldDebounce(CATALOG_FILTER_IDS.search);
}

/**
 * Repaint the bar from state.
 * `total` is the size of the matching set, which the bar reports so the collapsed row still says something useful while the panel is shut.
 */
export function syncCatalogFilterBar(
  state: CatalogFilterState,
  defaults: CatalogFilterState,
  total?: number
): void {
  setActiveCategory(CATALOG_FILTER_IDS.category, state.category);
  setActiveOnlyState(CATALOG_FILTER_IDS.activeOnly, state.activeOnly);
  setSortValue(CATALOG_FILTER_IDS.sort, state.sort, state.sortOrder);

  // Repainted from state, which is also what fills the box for a search arriving as `?q=`.
  //
  // Skipped for a field that is focused *or* still holding an undispatched keystroke.
  // Focus alone is not enough: clicking a filter moves focus off the field while its debounce is pending, the reload repaints the old term over what was typed, and the debounce then fires reading the overwritten value, the search is lost twice over.
  const field = document.getElementById(CATALOG_FILTER_IDS.search);
  if (
    field &&
    document.activeElement !== field &&
    field.dataset.searchPending !== 'true'
  ) {
    setSearchFieldValue(CATALOG_FILTER_IDS.search, state.search);
  }

  const count = countActiveFilters(state, defaults);
  const badge = document.getElementById('catalog-filters-count');
  if (badge) {
    badge.textContent = String(count);
    badge.hidden = count === 0;
  }

  // The toggle's aria-label replaces its subtree, so the badge's number is never announced unless the name carries it. axe cannot see this: the button has a name either way.
  const toggle = document.getElementById('catalog-filters-toggle');
  if (toggle) {
    toggle.setAttribute(
      'aria-label',
      count === 0 ? 'Filters' : `Filters, ${count} applied`
    );
  }

  // Cleared rather than left alone when the total is unknown, this call also runs before each request, and on a failed load it is the only one, so keeping the old figure would advertise the previous filter set's count beside the new filters.
  // Blank matches the card skeletons.
  const summary = document.getElementById('catalog-filters-summary');
  if (summary) {
    summary.textContent =
      typeof total === 'number' ? `${formatCount(total)} lots` : '';
  }
}
