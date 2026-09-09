import { describe, it, expect, beforeEach } from 'vitest';
import {
  countActiveFilters,
  renderCatalogFilterBar,
  initCatalogFilterBar,
  syncCatalogFilterBar,
} from './CatalogFilterBar';
import type { CatalogFilterState } from '../../utils/catalogState';

const defaults: CatalogFilterState = {
  page: 1,
  itemsPerPage: 23,
  viewMode: 'grid',
  category: 'all',
  sort: 'created',
  sortOrder: 'desc',
  activeOnly: false,
  search: '',
};

describe('countActiveFilters', () => {
  it('counts nothing when the state is the page defaults', () => {
    expect(countActiveFilters(defaults, defaults)).toBe(0);
  });

  it('ignores page, itemsPerPage and viewMode, which are not filters', () => {
    const state = {
      ...defaults,
      page: 7,
      itemsPerPage: 99,
      viewMode: 'list' as const,
    };
    expect(countActiveFilters(state, defaults)).toBe(0);
  });

  it('counts category, search, activeOnly and sort separately', () => {
    const state = {
      ...defaults,
      category: 'tech',
      search: 'vase',
      activeOnly: true,
      sort: 'endsAt' as const,
    };
    expect(countActiveFilters(state, defaults)).toBe(4);
  });

  it('treats a whitespace-only search as no search', () => {
    expect(countActiveFilters({ ...defaults, search: '   ' }, defaults)).toBe(
      0
    );
  });

  /**
   * "Newest first" and "Oldest first" are both `sort:
   *  'created'` and differ only in order, so a sort counted on its field alone reads as unfiltered while a sort is applied.
   */
  it('counts a sort that changed only its order', () => {
    const state = { ...defaults, sortOrder: 'asc' as const };
    expect(countActiveFilters(state, defaults)).toBe(1);
  });

  it('measures sort against the page defaults, not a global default', () => {
    const homeDefaults = {
      ...defaults,
      sort: 'endsAt' as const,
      sortOrder: 'asc' as const,
    };
    const state = { ...homeDefaults };
    expect(countActiveFilters(state, homeDefaults)).toBe(0);
    expect(countActiveFilters(state, defaults)).toBe(1);
  });
});

describe('the toggle', () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="host"></div>`;
    document.getElementById('host')!.innerHTML = renderCatalogFilterBar();
    initCatalogFilterBar();
  });

  it('starts collapsed and says so', () => {
    const bar = document.getElementById('catalog-filter-bar')!;
    const toggle = document.getElementById('catalog-filters-toggle')!;
    expect(bar.dataset.expanded).toBe('false');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('expands on click and collapses again', () => {
    const bar = document.getElementById('catalog-filter-bar')!;
    const toggle = document.getElementById('catalog-filters-toggle')!;

    toggle.click();
    expect(bar.dataset.expanded).toBe('true');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    toggle.click();
    expect(bar.dataset.expanded).toBe('false');
  });

  it('Escape collapses it and returns focus to the toggle', () => {
    const bar = document.getElementById('catalog-filter-bar')!;
    const toggle = document.getElementById('catalog-filters-toggle')!;
    toggle.click();
    // A real browser focuses a button when you click it;
    //  jsdom's click() does not, and the handler only acts for a reader whose focus is inside the bar.
    toggle.focus();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(bar.dataset.expanded).toBe('false');
    expect(document.activeElement).toBe(toggle);
  });

  /**
   * Escape closes it wherever the reader is;
   *   a mouse click does not focus a button in every engine, so gating the close on focus stopped it closing at all in WebKit;
   *   but it must not pull focus off whatever else that same keypress just closed.
   */
  it('closes on Escape from outside without taking focus', () => {
    const bar = document.getElementById('catalog-filter-bar')!;
    const toggle = document.getElementById('catalog-filters-toggle')!;
    toggle.click();

    const elsewhere = document.getElementById('catalog-search-input')!;
    elsewhere.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(bar.dataset.expanded).toBe('false');
    expect(document.activeElement).toBe(elsewhere);
    expect(document.activeElement).not.toBe(toggle);
  });

  it('collapses when a category is chosen, so the grid is visible again', () => {
    const bar = document.getElementById('catalog-filter-bar')!;
    document.getElementById('catalog-filters-toggle')!.click();

    document
      .querySelector<HTMLButtonElement>('[data-catalog-filter="tech"]')!
      .click();

    expect(bar.dataset.expanded).toBe('false');
  });
});

describe('the active-filter badge', () => {
  beforeEach(() => {
    document.body.innerHTML = renderCatalogFilterBar();
    initCatalogFilterBar();
  });

  it('carries the hidden attribute while nothing is filtered', () => {
    syncCatalogFilterBar(defaults, defaults);
    const badge = document.getElementById('catalog-filters-count')!;
    expect(badge.hasAttribute('hidden')).toBe(true);
  });

  it('shows the number of changed filters', () => {
    syncCatalogFilterBar(
      { ...defaults, category: 'tech', activeOnly: true },
      defaults
    );
    const badge = document.getElementById('catalog-filters-count')!;
    expect(badge.hasAttribute('hidden')).toBe(false);
    expect(badge.textContent).toBe('2');
  });

  it('reports the size of the matching set', () => {
    syncCatalogFilterBar(defaults, defaults, 3199);
    expect(
      document.getElementById('catalog-filters-summary')!.textContent
    ).toBe('3,199 lots');
  });
});

describe('the panel controls', () => {
  beforeEach(() => {
    document.body.innerHTML = renderCatalogFilterBar();
    initCatalogFilterBar();
  });

  /**
   * The select has no visible label;
   *   the arrow beside it is decorative, so the name it announces is its only one.
   * Pinned to the exact string rather than "is truthy", which `renderSortDropdown`'s own default would satisfy whatever this bar passed it.
   */
  it('gives the sort select its accessible name', () => {
    const select = document.getElementById('catalog-sort-select')!;
    expect(select.getAttribute('aria-label')).toBe('Sort listings');
  });

  it('dispatches the same events CatalogStateManager already listens for', () => {
    const seen: string[] = [];
    for (const type of [
      'categoryFilterChange',
      'activeOnlyChange',
      'sortChange',
    ]) {
      document.addEventListener(type, () => seen.push(type));
    }

    document
      .querySelector<HTMLButtonElement>('[data-catalog-filter="art"]')!
      .click();
    const checkbox = document.getElementById(
      'catalog-active-only'
    ) as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    document
      .getElementById('catalog-sort-select')!
      .dispatchEvent(new Event('change'));

    expect(seen).toEqual([
      'categoryFilterChange',
      'activeOnlyChange',
      'sortChange',
    ]);
  });
});
