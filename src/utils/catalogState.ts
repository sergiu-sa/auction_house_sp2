import { toSortPreset } from '../api/listingQueries';
import { logError } from './logger';
import type { SortKey, SortOrder } from '../api/listingQueries';
import {
  CATALOG_URL_KEYS,
  parseCatalogUrl,
  serializeCatalogState,
} from './catalogUrl';

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
 * The catalog's resting filters.
 *
 * Collection shows exactly these at a bare `/collection.html` — its only override is
 * `itemsPerPage`, which is not a filter and never reaches a URL. So this doubles as the yardstick
 * for a link *to* the catalog built on another page, which is what Home's "View Full Catalog" does.
 */
export const CATALOG_STATE_DEFAULTS: CatalogFilterState = {
  page: 1,
  itemsPerPage: 12,
  viewMode: 'grid',
  category: 'all',
  sort: 'created',
  sortOrder: 'desc',
  activeOnly: false,
  search: '',
};

/**
 * The catalog's own keys from a query string, in the writer's order and spelling, so the two can be
 * compared as strings. Anything the catalog does not own is ignored, since the writer leaves it be.
 */
function normaliseQuery(search: string): string {
  const incoming = new URLSearchParams(search);
  const ours = new URLSearchParams();

  // `getAll`, not `get`: a repeated key would otherwise compare as canonical against a
  // serialisation that holds one value, so `?q=vintage&q=rolex` kept both in the address bar while
  // only `vintage` was applied. The republish collapses it, because `writeUrl` deletes before it
  // appends.
  for (const key of CATALOG_URL_KEYS) {
    for (const value of incoming.getAll(key)) ours.append(key, value);
  }

  const query = ours.toString();
  return query ? `?${query}` : '';
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
    this.state = { ...CATALOG_STATE_DEFAULTS, ...initialState };
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
   * Apply the filters handed to the page in its query string, without fetching.
   *
   * Seeding is the whole job:
   *  each page's first load repaints the filter bar from state before it fetches, which is what fills the search box and presses the right category.
   * Writing those controls here as well reads as necessary and is not, and measured, the write *without* the seed does nothing because that repaint blanks it straight back out.
   *
   * Takes the query string rather than reading `location`, so it can be tested without a browser.
   */
  public seedFromUrl(search: string = window.location.search): void {
    const parsed = parseCatalogUrl(search);
    this.seedState(parsed);

    // Republished only when the URL is not already the canonical form of what was taken from it.
    // Every value here is narrowed, so the two can disagree: `?category=xyz` shows all 3,199 lots
    // with no filter applied while the address bar still names a category, so the link the reader
    // copies carries a filter that was never applied. A URL that survives narrowing intact
    // serialises back to itself, and this does nothing.
    if (
      serializeCatalogState(this.state, this.defaults) !==
      normaliseQuery(search)
    ) {
      this.writeUrl();
    }
  }

  /**
   * Put the current filters in the address bar, so a link, a bookmark and the Back button all
   * describe the grid the reader is looking at.
   *
   * `replaceState`, never `pushState`: a filter change is a refinement of one view rather than a
   * new place, and pushing would make Back walk every keystroke's debounce before leaving the page.
   * Nothing listens for `popstate` — the URL is read once, on load.
   *
   * Only this module's own keys are rewritten. Rebuilding the whole query string instead would drop
   * a campaign parameter the reader arrived with, and dropping the hash would undo the skip link on
   * the reader's next filter change.
   */
  private writeUrl(): void {
    const url = new URL(window.location.href);

    for (const key of CATALOG_URL_KEYS) url.searchParams.delete(key);
    for (const [key, value] of new URLSearchParams(
      serializeCatalogState(this.state, this.defaults)
    )) {
      url.searchParams.append(key, value);
    }

    // `replaceState` throws on an opaque origin — the built page opened over `file://`, or a
    // sandboxed iframe without `allow-same-origin` — and Safari throws past roughly 100 calls in
    // 30 seconds. Unguarded and running first, that took the refetch down with it: the filter bar
    // had already repainted, so the grid sat showing the previous result set, and via `goToPage`
    // the panel never collapsed and focus never moved. The grid is the feature; this is bookkeeping.
    try {
      window.history.replaceState(
        null,
        '',
        `${url.pathname}${url.search}${url.hash}`
      );
    } catch (error) {
      logError('Could not publish the catalog filters to the URL', error);
    }
  }

  /**
   * Every change that refetches also republishes the URL, and the two that do not refetch do not
   * publish either: `updateViewMode` is a layout the URL has no say over, and `seedFromUrl`
   * publishes only when the URL is not already the canonical form of what it just read.
   *
   * The refetch goes first, so the grid does not depend on the address bar.
   */
  private notify(): void {
    this.onChange();
    this.writeUrl();
  }

  /**
   * Pull the page back inside the result set, now that the caller knows how large it is.
   *
   * `parseCatalogUrl` can only clamp the floor — the ceiling is not known until the fetch answers —
   * so a URL is the one way into a page that does not exist. `?page=9999` measured as an empty grid
   * reading "3,199 lots", a pager saying "Page 9999 of 140", and a NEXT button still *enabled*
   * pointing at 10000. Reachable without hand-editing: a bookmarked `?page=140` goes out of range
   * as auctions end and the pool shrinks.
   *
   * `pageCount` is floored at 1 rather than treated as "no page to go to". A zero is a real
   * response, not a theoretical one — `listings-empty.json` records `"pageCount": 0` and
   * `catalogPage`'s `?? 1` keeps an explicit zero, since `??` only fires on nullish — and bailing
   * on it left `?page=7` in the address bar over an empty state, so the bookmark still named a page
   * that does not exist. Flooring cannot loop: page 1 against a floor of 1 does not move.
   *
   * @returns whether it moved, so the caller can skip rendering a page it is about to replace.
   */
  public clampToPageCount(pageCount: number): boolean {
    const last = Math.max(1, pageCount);
    if (this.state.page <= last) return false;

    this.updatePage(last);
    return true;
  }

  /** Back to the filters this page started on — which are not the class defaults if the page passed its own. */
  public resetFilters(): void {
    const { viewMode, itemsPerPage } = this.state;
    this.state = { ...this.defaults, viewMode, itemsPerPage };
    this.notify();
  }

  public updatePage(page: number): void {
    this.state.page = page;
    this.notify();
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
      this.notify();
    }) as EventListener;

    const handleSearch = ((e: CustomEvent) => {
      this.state.search = e.detail.query;
      this.state.page = 1;
      this.notify();
    }) as EventListener;

    const handleActiveOnly = ((e: CustomEvent) => {
      this.state.activeOnly = e.detail.activeOnly;
      this.state.page = 1;
      this.notify();
    }) as EventListener;

    const handleSort = ((e: CustomEvent) => {
      // Narrowed as a pair rather than as two independent halves, so the writer cannot publish a
      // sort the reader refuses: `endsAt desc` is two valid values naming no option, and it would
      // reach the URL and then be dropped on the next load. An unrecognised pair leaves the
      // current sort standing — an unknown field is a 500 from the API.
      const preset = toSortPreset(e.detail.sort, e.detail.order);
      if (preset) {
        this.state.sort = preset.sort;
        this.state.sortOrder = preset.order;
      }
      this.state.page = 1;
      this.notify();
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
