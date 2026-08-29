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
 * The filter state behind Home's catalog section and the Collection page, both driven by the same navbar events.
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

  public listenToNavbarFilters(): void {
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
      { type: 'globalSearchInput', listener: handleSearch },
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
