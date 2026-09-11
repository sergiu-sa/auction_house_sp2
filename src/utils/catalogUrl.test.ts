import { describe, it, expect } from 'vitest';
import { serializeCatalogState, parseCatalogUrl } from './catalogUrl';
import type { CatalogFilterState } from './catalogState';

/** Collection's starting filters. */
const COLLECTION: CatalogFilterState = {
  page: 1,
  itemsPerPage: 23,
  viewMode: 'grid',
  category: 'all',
  sort: 'created',
  sortOrder: 'desc',
  activeOnly: false,
  search: '',
};

/** Home's, which differ in the sort — the reason the writer takes the defaults as an argument. */
const HOME: CatalogFilterState = {
  ...COLLECTION,
  itemsPerPage: 11,
  sort: 'endsAt',
  sortOrder: 'asc',
};

describe('serializeCatalogState', () => {
  it('writes nothing for the filters a page starts on', () => {
    expect(serializeCatalogState(COLLECTION, COLLECTION)).toBe('');
    expect(serializeCatalogState(HOME, HOME)).toBe('');
  });

  it('writes only the fields the reader changed', () => {
    const state = { ...COLLECTION, search: 'vintage', category: 'art' };

    expect(serializeCatalogState(state, COLLECTION)).toBe(
      '?q=vintage&category=art'
    );
  });

  it('measures each field against the defaults it was given, not the class defaults', () => {
    // `endsAt asc` is a changed sort on Collection and the resting state on Home.
    const state = {
      ...COLLECTION,
      sort: 'endsAt' as const,
      sortOrder: 'asc' as const,
    };

    expect(serializeCatalogState(state, COLLECTION)).toBe(
      '?sort=endsAt&order=asc'
    );
    expect(serializeCatalogState({ ...state, itemsPerPage: 11 }, HOME)).toBe(
      ''
    );
  });

  it('writes the whole filter set in a fixed order, so one state has one URL', () => {
    const state: CatalogFilterState = {
      ...COLLECTION,
      page: 4,
      category: 'art',
      sort: 'endsAt',
      sortOrder: 'asc',
      activeOnly: true,
      search: 'vintage',
    };

    expect(serializeCatalogState(state, COLLECTION)).toBe(
      '?q=vintage&category=art&active=true&sort=endsAt&order=asc&page=4'
    );
  });

  it('percent-encodes a term rather than letting it break the query string', () => {
    const state = { ...COLLECTION, search: 'rolex & omega?' };

    expect(serializeCatalogState(state, COLLECTION)).toBe(
      '?q=rolex+%26+omega%3F'
    );
  });

  it('leaves out a term that is only whitespace, which is not a filter', () => {
    expect(
      serializeCatalogState({ ...COLLECTION, search: '   ' }, COLLECTION)
    ).toBe('');
  });

  it('omits the layout, which no reader chose and no link should carry', () => {
    const state = {
      ...COLLECTION,
      viewMode: 'list' as const,
      itemsPerPage: 7,
    };

    expect(serializeCatalogState(state, COLLECTION)).toBe('');
  });
});

describe('parseCatalogUrl', () => {
  it('reads the whole filter set back out of a URL it wrote', () => {
    const state: CatalogFilterState = {
      ...COLLECTION,
      page: 4,
      category: 'art',
      sort: 'endsAt',
      sortOrder: 'asc',
      activeOnly: true,
      search: 'rolex & omega?',
    };

    expect(parseCatalogUrl(serializeCatalogState(state, COLLECTION))).toEqual({
      search: 'rolex & omega?',
      category: 'art',
      activeOnly: true,
      sort: 'endsAt',
      sortOrder: 'asc',
      page: 4,
    });
  });

  it('returns nothing at all for a URL carrying no filters', () => {
    expect(parseCatalogUrl('')).toEqual({});
    expect(parseCatalogUrl('?ref=newsletter&utm_source=x')).toEqual({});
  });

  it('trims the term, so a padded one does not reach the query as typed', () => {
    expect(parseCatalogUrl('?q=%20%20vintage%20%20')).toEqual({
      search: 'vintage',
    });
  });

  it('drops a term that is only whitespace', () => {
    expect(parseCatalogUrl('?q=%20%20')).toEqual({});
  });

  it('narrows a category it does not offer, rather than querying a tag nothing carries', () => {
    expect(parseCatalogUrl('?category=xyz')).toEqual({ category: 'all' });
    expect(parseCatalogUrl('?category=art')).toEqual({ category: 'art' });
  });

  /**
   * A field the catalog does not sort by is a malformed URL, not a request for the default one.
   * Collapsing it to `created` (which is what `toSortKey` does for a `<select>`, where an unknown
   * field is a 500) made `?sort=price` a real "Oldest first" nobody chose — and on Home, which
   * rests on `endsAt asc`, it overrode the page's own default and counted as an applied filter.
   */
  it('drops a sort field the catalog does not offer', () => {
    expect(parseCatalogUrl('?sort=credits&order=asc')).toEqual({});
    expect(parseCatalogUrl('?sort=price&order=asc')).toEqual({});
    expect(parseCatalogUrl('?q=vintage&sort=price')).toEqual({
      search: 'vintage',
    });
  });

  it('drops a direction that is neither asc nor desc', () => {
    expect(parseCatalogUrl('?sort=title&order=bogus')).toEqual({});
    expect(parseCatalogUrl('?sort=title&order=')).toEqual({});
    // Present-and-valid still works, so the above is not just "any order key drops the sort".
    expect(parseCatalogUrl('?sort=title&order=desc')).toEqual({
      sort: 'title',
      sortOrder: 'desc',
    });
  });

  it('drops a sort pair the dropdown cannot show, keeping the bar and the grid in step', () => {
    // Both halves are individually valid; there is no "endsAt desc" option.
    expect(parseCatalogUrl('?sort=endsAt&order=desc')).toEqual({});
    expect(parseCatalogUrl('?q=vintage&sort=endsAt&order=desc')).toEqual({
      search: 'vintage',
    });
  });

  it('completes a half-written sort from the only direction offered for that field', () => {
    expect(parseCatalogUrl('?sort=endsAt')).toEqual({
      sort: 'endsAt',
      sortOrder: 'asc',
    });
  });

  it('ignores a direction with no field, which would otherwise conjure a sort nobody asked for', () => {
    // `order=asc` alone would narrow to the default field and return `created asc` as if it were chosen.
    expect(parseCatalogUrl('?order=asc')).toEqual({});
  });

  it('reads active only when it says true, so ?active=0 is not a filter', () => {
    expect(parseCatalogUrl('?active=true')).toEqual({ activeOnly: true });
    expect(parseCatalogUrl('?active=1')).toEqual({});
    expect(parseCatalogUrl('?active=false')).toEqual({});
  });

  it('clamps a page to a whole number of at least one', () => {
    expect(parseCatalogUrl('?page=4')).toEqual({ page: 4 });
    expect(parseCatalogUrl('?page=0')).toEqual({ page: 1 });
    expect(parseCatalogUrl('?page=-3')).toEqual({ page: 1 });
    expect(parseCatalogUrl('?page=2.7')).toEqual({ page: 2 });
    expect(parseCatalogUrl('?page=abc')).toEqual({});
    expect(parseCatalogUrl('?page=')).toEqual({});
  });

  it('never returns the layout, which the URL has no say over', () => {
    const parsed = parseCatalogUrl('?view=list&per=7&itemsPerPage=7');

    expect(parsed).toEqual({});
    expect('viewMode' in parsed).toBe(false);
    expect('itemsPerPage' in parsed).toBe(false);
  });
});
