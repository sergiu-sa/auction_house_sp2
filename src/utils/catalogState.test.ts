import { describe, it, expect, afterEach, vi } from 'vitest';
import { CatalogStateManager } from './catalogState';

describe('CatalogStateManager', () => {
  let manager: CatalogStateManager;

  // The manager binds to `document`, so a leaked instance answers the next test's events too.
  afterEach(() => manager?.cleanup());

  it('starts on the class defaults', () => {
    manager = new CatalogStateManager({}, vi.fn());

    expect(manager.getState()).toEqual({
      page: 1,
      itemsPerPage: 12,
      viewMode: 'grid',
      category: 'all',
      sort: 'created',
      sortOrder: 'desc',
      activeOnly: false,
      search: '',
    });
  });

  it('lets a page override the defaults it does not share', () => {
    manager = new CatalogStateManager(
      { sort: 'endsAt', sortOrder: 'asc', itemsPerPage: 24 },
      vi.fn()
    );

    const state = manager.getState();
    expect(state.sort).toBe('endsAt');
    expect(state.sortOrder).toBe('asc');
    expect(state.itemsPerPage).toBe(24);
  });

  // Home's ?q= handling wrote a filter straight onto getState() and the search was silently dropped.
  it('hands out a copy, so writing to it changes nothing', () => {
    manager = new CatalogStateManager({}, vi.fn());

    manager.getState().search = 'vintage';

    expect(manager.getState().search).toBe('');
  });

  it('seeds state without refetching', () => {
    const onChange = vi.fn();
    manager = new CatalogStateManager({}, onChange);

    manager.seedState({ search: 'vintage' });

    expect(manager.getState().search).toBe('vintage');
    expect(onChange).not.toHaveBeenCalled();
  });

  /**
   * This lived in `Home.ts` only, inside `src/pages/**`, which coverage excludes, so these are the first assertions it has ever had, and `Collection` reading `?q=` at all is new behaviour rather than a move.
   * The string is passed in rather than stubbed onto `location`.
   */
  describe('seedSearchFromUrl', () => {
    it('seeds the term without refetching, so the first load applies it', () => {
      const onChange = vi.fn();
      manager = new CatalogStateManager({}, onChange);

      manager.seedSearchFromUrl('?q=vintage');

      expect(manager.getState().search).toBe('vintage');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('trims it, so a padded term does not reach the query as typed', () => {
      manager = new CatalogStateManager({}, vi.fn());
      manager.seedSearchFromUrl('?q=%20%20vintage%20%20');
      expect(manager.getState().search).toBe('vintage');
    });

    it('leaves state alone when there is no term to apply', () => {
      manager = new CatalogStateManager({}, vi.fn());
      // Absent, empty and whitespace-only all mean "the reader asked for nothing".
      for (const search of ['', '?', '?q=', '?q=%20%20', '?page=2']) {
        manager.seedSearchFromUrl(search);
        expect(manager.getState().search, search).toBe('');
      }
    });

    /**
     * The default is the only form either page actually calls, and every case above injects a string, so the argument they all exercise is the one that never ships.
     * Measured: changing the default to `window.location.hash` left all 15 of these green.
     *
     * jsdom's `history.replaceState` moves `location.search` for real, so this exercises the default rather than restubbing the thing under test.
     */
    it('falls back to the page URL, which is how both pages call it', () => {
      const original = window.location.href;
      window.history.replaceState({}, '', '/collection.html?q=handbag&page=2');

      manager = new CatalogStateManager({}, vi.fn());
      manager.seedSearchFromUrl();

      expect(manager.getState().search).toBe('handbag');
      window.history.replaceState({}, '', original);
    });

    it('reads nothing from a URL that carries no term', () => {
      const original = window.location.href;
      window.history.replaceState({}, '', '/collection.html?page=2');

      manager = new CatalogStateManager({}, vi.fn());
      manager.seedSearchFromUrl();

      expect(manager.getState().search).toBe('');
      window.history.replaceState({}, '', original);
    });

    it('reads q and not some other parameter that happens to be there', () => {
      manager = new CatalogStateManager({}, vi.fn());
      manager.seedSearchFromUrl('?user=Seller13&q=handbag&page=3');
      expect(manager.getState().search).toBe('handbag');
      // Seeding a search must not smuggle in a page number from the same string.
      expect(manager.getState().page).toBe(1);
    });
  });

  it('refetches on a page change', () => {
    const onChange = vi.fn();
    manager = new CatalogStateManager({}, onChange);

    manager.updatePage(2);

    expect(manager.getState().page).toBe(2);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  // The listings in hand already cover both layouts.
  it('does not refetch on a view-mode change', () => {
    const onChange = vi.fn();
    manager = new CatalogStateManager({}, onChange);

    manager.updateViewMode('list');

    expect(manager.getState().viewMode).toBe('list');
    expect(onChange).not.toHaveBeenCalled();
  });

  describe('resetFilters', () => {
    it('returns to the filters the page started on, not the class defaults', () => {
      const onChange = vi.fn();
      manager = new CatalogStateManager(
        { sort: 'endsAt', sortOrder: 'asc' },
        onChange
      );

      manager.seedState({ category: 'tech', search: 'laptop', page: 3 });
      manager.resetFilters();

      const state = manager.getState();
      expect(state.category).toBe('all');
      expect(state.search).toBe('');
      expect(state.page).toBe(1);
      expect(state.sort).toBe('endsAt');
      expect(state.sortOrder).toBe('asc');
      // Sort and active-only are both part of the query, so the pool itself is stale after a reset.
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('leaves the layout alone — it is not a filter', () => {
      manager = new CatalogStateManager({ itemsPerPage: 24 }, vi.fn());

      manager.updateViewMode('list');
      manager.resetFilters();

      const state = manager.getState();
      expect(state.viewMode).toBe('list');
      expect(state.itemsPerPage).toBe(24);
    });
  });

  describe('filter events', () => {
    it('applies each filter and returns to page one', () => {
      const onChange = vi.fn();
      manager = new CatalogStateManager({}, onChange);
      manager.listenToFilterEvents();
      manager.seedState({ page: 4 });

      document.dispatchEvent(
        new CustomEvent('activeOnlyChange', { detail: { activeOnly: true } })
      );
      expect(manager.getState().activeOnly).toBe(true);
      expect(manager.getState().page).toBe(1);

      document.dispatchEvent(
        new CustomEvent('categoryFilterChange', { detail: { category: 'art' } })
      );
      expect(manager.getState().category).toBe('art');

      document.dispatchEvent(
        new CustomEvent('catalogSearchInput', { detail: { query: 'vase' } })
      );
      expect(manager.getState().search).toBe('vase');

      expect(onChange).toHaveBeenCalledTimes(3);
    });

    // An unknown sort field is a 500 from the API, not a silent ignore.
    it('narrows a sort field it does not recognise', () => {
      manager = new CatalogStateManager({}, vi.fn());
      manager.listenToFilterEvents();

      document.dispatchEvent(
        new CustomEvent('sortChange', {
          detail: { sort: 'bids', order: 'sideways' },
        })
      );

      const state = manager.getState();
      expect(state.sort).toBe('created');
      expect(state.sortOrder).toBe('desc');
    });

    it('stops listening after cleanup', () => {
      const onChange = vi.fn();
      manager = new CatalogStateManager({}, onChange);
      manager.listenToFilterEvents();
      manager.cleanup();

      document.dispatchEvent(
        new CustomEvent('activeOnlyChange', { detail: { activeOnly: true } })
      );

      expect(manager.getState().activeOnly).toBe(false);
      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
