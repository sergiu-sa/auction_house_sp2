import { toSortKey, toSortOrder } from '../api/listingQueries';
import type { SortKey, SortOrder } from '../api/listingQueries';

export interface CatalogFilterState {
  page: number;
  itemsPerPage: number;
  viewMode: 'grid' | 'list';
  category: string;
  sort: SortKey;
  sortOrder: SortOrder;
  activeOnly: boolean;
  search: string;
}

/**
 * The filter state behind Home's catalog section and the Collection page, both driven by the same events;
 *    dispatched by the catalog filter bar on `document`, not by the navbar, which carried a search box until that variant was retired.
 * It owns the filters only — each page keeps its own listings and decides how to render them.
 *
 * Every filter here is part of the API query, so each change is a refetch rather than a re-slice of what was already loaded.
 */
export class CatalogStateManager {
  private state: CatalogFilterState;
  private readonly defaults: CatalogFilterState;
  private onChange: () => void;
  private listeners: Array<{ type: string; listener: EventListener }> = [];

  constructor(initialState: Partial<CatalogFilterState>, onChange: () => void) {
    this.state = {
      page: 1,
      itemsPerPage: 12,
      viewMode: 'grid',
      category: 'all',
      sort: 'created',
      sortOrder: 'desc',
      activeOnly: false,
      search: '',
      ...initialState,
    };
    this.defaults = { ...this.state };
    this.onChange = onChange;
  }

  /** A copy. Filters are read through this and written through the setters below, never back through it. */
  public getState(): CatalogFilterState {
    return { ...this.state };
  }

  /**
   * Applies filters without refetching, for seeding state ahead of the first load.
   * Every other setter fires the change callback; this one leaves the fetch to the caller.
   */
  public seedState(updates: Partial<CatalogFilterState>): void {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Apply a search handed to the page in its query string, without fetching.
   *
   * `Home` had this and `Collection` did not, so reading `?q=` on the catalog is a **new capability**, not a pure extraction;
   *   the catalog previously dropped the term and fetched the whole pool.
   * It lives here because `src/pages/**` is excluded from coverage, so Home's copy had never been tested and a second copy would have made that two.
   * Seeding is the whole job:
   *  each page's first load repaints the filter bar from state before it fetches, which is what fills the search box.
   * Writing the field here as well reads as necessary and is not, and measured, the write *without* the seed does nothing because that repaint blanks it straight back out.
   *
   * Takes the query string rather than reading `location`, so it can be tested without a browser.
   */
  public seedSearchFromUrl(search: string = window.location.search): void {
    const query = new URLSearchParams(search).get('q')?.trim();
    if (!query) return;

    this.seedState({ search: query });
  }

  /** Back to the filters this page started on — which are not the class defaults if the page passed its own. */
  public resetFilters(): void {
    const { viewMode, itemsPerPage } = this.state;
    this.state = { ...this.defaults, viewMode, itemsPerPage };
    this.onChange();
  }

  public updatePage(page: number): void {
    this.state.page = page;
    this.onChange();
  }

  /** No refetch: the view toggle re-renders the page of listings already in hand. */
  public updateViewMode(viewMode: 'grid' | 'list'): void {
    this.state.viewMode = viewMode;
  }

  public listenToFilterEvents(): void {
    // Re-binding would orphan the previous set — unremovable, and every filter change would fetch twice.
    this.cleanup();

    const handleCategory = ((e: CustomEvent) => {
      this.state.category = e.detail.category;
      this.state.page = 1;
      this.onChange();
    }) as EventListener;

    const handleSearch = ((e: CustomEvent) => {
      this.state.search = e.detail.query;
      this.state.page = 1;
      this.onChange();
    }) as EventListener;

    const handleActiveOnly = ((e: CustomEvent) => {
      this.state.activeOnly = e.detail.activeOnly;
      this.state.page = 1;
      this.onChange();
    }) as EventListener;

    const handleSort = ((e: CustomEvent) => {
      // Narrowed, not trusted: an unknown sort field is a 500 from the API.
      this.state.sort = toSortKey(e.detail.sort);
      this.state.sortOrder = toSortOrder(e.detail.order);
      this.state.page = 1;
      this.onChange();
    }) as EventListener;

    this.listeners = [
      { type: 'categoryFilterChange', listener: handleCategory },
      { type: 'catalogSearchInput', listener: handleSearch },
      { type: 'activeOnlyChange', listener: handleActiveOnly },
      { type: 'sortChange', listener: handleSort },
    ];

    for (const { type, listener } of this.listeners) {
      document.addEventListener(type, listener);
    }
  }

  public cleanup(): void {
    for (const { type, listener } of this.listeners) {
      document.removeEventListener(type, listener);
    }
    this.listeners = [];
  }
}
