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
   * This lived in `Home.ts` only, inside `src/pages/**`, which coverage excludes, so these are the first assertions it has ever had, and `Collection` reading the URL at all is new behaviour rather than a move.
   * The string is passed in rather than stubbed onto `location`.
   *
   * Narrowing is `catalogUrl.test.ts`'s subject, not this one's;
   *  what is asserted here is that the manager applies the whole parsed set and still does not fetch.
   */
  describe('seedFromUrl', () => {
    it('seeds every filter the URL carries, without refetching', () => {
      const onChange = vi.fn();
      manager = new CatalogStateManager({}, onChange);

      manager.seedFromUrl(
        '?q=vintage&category=art&active=true&sort=endsAt&order=asc&page=4'
      );

      expect(manager.getState()).toMatchObject({
        search: 'vintage',
        category: 'art',
        activeOnly: true,
        sort: 'endsAt',
        sortOrder: 'asc',
        page: 4,
      });
      expect(onChange).not.toHaveBeenCalled();
    });

    it('leaves the filters alone when the URL asks for nothing', () => {
      manager = new CatalogStateManager({}, vi.fn());
      const resting = manager.getState();

      for (const search of ['', '?', '?q=', '?q=%20%20', '?ref=newsletter']) {
        manager.seedFromUrl(search);
        expect(manager.getState(), search).toEqual(resting);
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
      manager.seedFromUrl();

      expect(manager.getState().search).toBe('handbag');
      expect(manager.getState().page).toBe(2);
      window.history.replaceState({}, '', original);
    });

    it('ignores a parameter that is not one of its own', () => {
      manager = new CatalogStateManager({}, vi.fn());
      manager.seedFromUrl('?user=Seller13&q=handbag&id=abc');

      expect(manager.getState().search).toBe('handbag');
      // `?user=` and `?id=` belong to the profile and lot pages; a catalog seeded from a URL
      // carrying them must not treat them as filters.
      expect(manager.getState().category).toBe('all');
      expect(manager.getState().page).toBe(1);
    });

    it('never takes the layout from a URL', () => {
      manager = new CatalogStateManager({ itemsPerPage: 23 }, vi.fn());
      manager.seedFromUrl('?view=list&per=7&itemsPerPage=7&q=vintage');

      expect(manager.getState().viewMode).toBe('grid');
      expect(manager.getState().itemsPerPage).toBe(23);
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

  /**
   * The address bar is the other half of `seedFromUrl`: a key written and never read resurrects a
   * filter the reader cleared, and a key read and never written leaves the URL describing a grid
   * that has moved on. The second of those shipped.
   *
   * jsdom implements `history.replaceState` and `location` for real, so these read the URL back
   * rather than spying on the call.
   */
  describe('the address bar', () => {
    const at = (url: string): void => window.history.replaceState({}, '', url);

    afterEach(() => at('/'));

    it('publishes a filter the reader set', () => {
      at('/collection.html');
      manager = new CatalogStateManager({}, vi.fn());
      manager.listenToFilterEvents();

      document.dispatchEvent(
        new CustomEvent('catalogSearchInput', { detail: { query: 'vintage' } })
      );

      expect(window.location.search).toBe('?q=vintage');
    });

    it('publishes a page change, so Back from a lot returns to the right one', () => {
      at('/collection.html');
      manager = new CatalogStateManager({}, vi.fn());

      manager.updatePage(4);

      expect(window.location.search).toBe('?page=4');
    });

    it('empties on a reset, rather than leaving the cleared filters behind', () => {
      at('/collection.html?q=vintage&category=art&page=4');
      manager = new CatalogStateManager({}, vi.fn());
      manager.seedFromUrl();

      manager.resetFilters();

      // The defect this fixes: the term stayed in the URL after Clear, so the next reload restored it.
      expect(window.location.search).toBe('');
      expect(window.location.pathname).toBe('/collection.html');
    });

    /**
     * The term is seeded past the writer rather than through it, so the state holds a filter the
     * URL does not. A view-mode change that published would put `?q=vintage` there; one that stays
     * silent leaves the bare path. Seeding from a URL that already said `?q=vintage` made both
     * outcomes the same string, which is how this passed while the toggle did publish.
     */
    it('says nothing about the layout, which has no key', () => {
      at('/collection.html');
      manager = new CatalogStateManager({}, vi.fn());
      manager.seedState({ search: 'vintage' });

      manager.updateViewMode('list');

      expect(manager.getState().viewMode).toBe('list');
      expect(window.location.search).toBe('');
    });

    it('measures against the page it is on, so a resting Home carries no sort', () => {
      at('/index.html');
      manager = new CatalogStateManager(
        { sort: 'endsAt', sortOrder: 'asc', itemsPerPage: 11 },
        vi.fn()
      );

      manager.updatePage(2);

      // Home rests on `endsAt asc`; spelling its own defaults out would make every Home link look filtered.
      expect(window.location.search).toBe('?page=2');
    });

    it('leaves a parameter it does not own, and the hash, where they are', () => {
      at('/collection.html?utm_source=newsletter#main-content');
      manager = new CatalogStateManager({}, vi.fn());
      manager.listenToFilterEvents();

      document.dispatchEvent(
        new CustomEvent('categoryFilterChange', { detail: { category: 'art' } })
      );

      // Rebuilding the query string would drop the campaign tag; dropping the hash would undo the
      // skip link on the reader's next filter change.
      expect(window.location.search).toBe(
        '?utm_source=newsletter&category=art'
      );
      expect(window.location.hash).toBe('#main-content');
    });

    /**
     * The refetch must not depend on the address bar.
     *
     * `replaceState` throws on an opaque origin and Safari throws past ~100 calls in 30s; running
     * it first and unguarded meant one throw inside a filter listener skipped `onChange` entirely,
     * leaving the grid on the previous result set under a bar that had already repainted.
     */
    it('refetches even when the URL cannot be written', () => {
      at('/collection.html');
      const onChange = vi.fn();
      const replaceState = vi
        .spyOn(window.history, 'replaceState')
        .mockImplementation(() => {
          throw new DOMException('denied', 'SecurityError');
        });

      manager = new CatalogStateManager({}, onChange);
      manager.updatePage(2);

      expect(replaceState).toHaveBeenCalled();
      expect(onChange).toHaveBeenCalledTimes(1);
      replaceState.mockRestore();
    });

    it('refetches before it publishes, not after', () => {
      at('/collection.html');
      const seen: (string | null)[] = [];
      manager = new CatalogStateManager({}, () =>
        seen.push(window.location.search)
      );

      manager.updatePage(2);

      // The URL still reads empty inside the callback, which is what says the fetch went first.
      // Asserting the final value instead would pass in either order.
      expect(seen).toEqual(['']);
      expect(window.location.search).toBe('?page=2');
    });

    it('replaces rather than pushes, so Back leaves the page instead of walking filters', () => {
      at('/collection.html');
      const depth = window.history.length;
      manager = new CatalogStateManager({}, vi.fn());

      manager.updatePage(2);
      manager.updatePage(3);
      manager.updatePage(4);

      expect(window.location.search).toBe('?page=4');
      expect(window.history.length).toBe(depth);
    });
  });

  /**
   * `parseCatalogUrl` can only clamp the floor; the ceiling arrives with the fetch. So a URL is the
   * one way onto a page that does not exist, and `?page=9999` measured as an empty grid reading
   * "3,199 lots" beside a pager saying "Page 9999 of 140" with NEXT still enabled.
   */
  describe('clampToPageCount', () => {
    const at = (url: string): void => window.history.replaceState({}, '', url);

    afterEach(() => at('/'));

    it('moves to the last page and says so, refetching and republishing', () => {
      at('/collection.html?page=9999');
      const onChange = vi.fn();
      manager = new CatalogStateManager({}, onChange);
      manager.seedFromUrl();

      expect(manager.clampToPageCount(140)).toBe(true);
      expect(manager.getState().page).toBe(140);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(window.location.search).toBe('?page=140');
    });

    it('leaves a page inside the set alone, without refetching', () => {
      at('/collection.html?page=3');
      const onChange = vi.fn();
      manager = new CatalogStateManager({}, onChange);
      manager.seedFromUrl();

      expect(manager.clampToPageCount(140)).toBe(false);
      expect(manager.getState().page).toBe(3);
      expect(onChange).not.toHaveBeenCalled();
      // Anchored on the page having actually been seeded, or "did not move" proves nothing.
      expect(window.location.search).toBe('?page=3');
    });

    /**
     * `pageCount: 0` is a real response, not a theoretical one: `listings-empty.json` records it and
     * `catalogPage`'s `?? 1` keeps an explicit zero, because `??` only fires on nullish. Bailing on
     * it left `?page=7` in the address bar over an empty state, so the bookmark the reader saved
     * still named a page that does not exist.
     */
    it('treats an empty result set as a single page rather than none', () => {
      at('/collection.html?page=7');
      const onChange = vi.fn();
      manager = new CatalogStateManager({}, onChange);
      manager.seedFromUrl();

      expect(manager.clampToPageCount(0)).toBe(true);
      expect(manager.getState().page).toBe(1);
      expect(onChange).toHaveBeenCalledTimes(1);
      // Page 1 is the default, so the key leaves the URL rather than being spelt back as `?page=1`.
      expect(window.location.search).toBe('');
    });

    it('does not move again once it is on page one of an empty set', () => {
      at('/collection.html');
      const onChange = vi.fn();
      manager = new CatalogStateManager({}, onChange);

      // The floor cannot loop: page 1 against a floor of 1 does not move.
      expect(manager.clampToPageCount(0)).toBe(false);
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  /**
   * Every value the URL carries is narrowed, so the address bar and the state can disagree the
   * moment the URL is malformed. `?category=xyz` showed all 3,199 lots with no filter applied while
   * the address bar still named a category — so the link the reader copied carried a filter that
   * was never applied, and it self-healed only on their first filter change.
   */
  describe('a URL that does not survive narrowing', () => {
    const at = (url: string): void => window.history.replaceState({}, '', url);

    afterEach(() => at('/'));

    it('is rewritten to what was actually applied', () => {
      at('/collection.html?category=xyz&sort=price&page=0');
      const onChange = vi.fn();
      manager = new CatalogStateManager({}, onChange);

      manager.seedFromUrl();

      expect(window.location.search).toBe('');
      // Still no fetch: seeding runs before the page's first load either way.
      expect(onChange).not.toHaveBeenCalled();
    });

    it('keeps what did survive, and the keys it does not own', () => {
      at('/collection.html?utm_source=x&q=vintage&category=xyz');
      manager = new CatalogStateManager({}, vi.fn());

      manager.seedFromUrl();

      expect(window.location.search).toBe('?utm_source=x&q=vintage');
    });

    /**
     * The campaign tag is the point: the comparison has to ignore keys the catalog does not own, or
     * a canonical URL carrying one looks different from its own serialisation and every load spends
     * a write. The rewrite would produce the same string either way, so only the spy can see it.
     */
    /**
     * A repeated key compared as canonical while only the first value was applied, because
     * `normaliseQuery` read `get` rather than `getAll` — so the address bar kept both and the link
     * the reader copied named a filter that never ran.
     */
    it('collapses a key the URL carries twice', () => {
      at('/collection.html?q=vintage&q=rolex');
      manager = new CatalogStateManager({}, vi.fn());

      manager.seedFromUrl();

      expect(manager.getState().search).toBe('vintage');
      expect(window.location.search).toBe('?q=vintage');
    });

    it('leaves a URL that is already canonical untouched', () => {
      at('/collection.html?utm_source=x&q=vintage&category=art&page=4');
      const replaceState = vi.spyOn(window.history, 'replaceState');
      manager = new CatalogStateManager({}, vi.fn());

      manager.seedFromUrl();

      // Not just "the string is the same" — the write must not happen at all, or the seed is
      // republishing its own input on every load.
      expect(replaceState).not.toHaveBeenCalled();
      expect(window.location.search).toBe(
        '?utm_source=x&q=vintage&category=art&page=4'
      );
      replaceState.mockRestore();
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
    /**
     * Started on Home's sort rather than the class defaults, which is the whole assertion:
     * `created desc` *is* the class default, so a manager built with `{}` reads the same whether
     * the pair was rejected or collapsed onto the default, and this passed either way.
     */
    it('leaves the sort standing when the pair names no option', () => {
      manager = new CatalogStateManager(
        { sort: 'endsAt', sortOrder: 'asc' },
        vi.fn()
      );
      manager.listenToFilterEvents();

      for (const detail of [
        { sort: 'bids', order: 'sideways' },
        { sort: 'bids', order: 'asc' },
        { sort: 'endsAt', order: 'desc' },
      ]) {
        document.dispatchEvent(new CustomEvent('sortChange', { detail }));

        const state = manager.getState();
        expect(state.sort, JSON.stringify(detail)).toBe('endsAt');
        expect(state.sortOrder, JSON.stringify(detail)).toBe('asc');
      }
    });

    it('applies a pair the dropdown does offer', () => {
      manager = new CatalogStateManager(
        { sort: 'endsAt', sortOrder: 'asc' },
        vi.fn()
      );
      manager.listenToFilterEvents();

      document.dispatchEvent(
        new CustomEvent('sortChange', {
          detail: { sort: 'title', order: 'desc' },
        })
      );

      expect(manager.getState().sort).toBe('title');
      expect(manager.getState().sortOrder).toBe('desc');
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
