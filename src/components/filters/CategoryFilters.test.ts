import { describe, it, expect } from 'vitest';
import { CATEGORIES } from './CategoryFilters';
import { toCategory } from '../../api/listingQueries';

/**
 * The buttons own the labels; `CATEGORY_KEYS` owns the vocabulary, because the URL parses against
 * it and the filter state publishes to it. Two lists that have to agree, so the agreement is
 * asserted rather than assumed — the same guard `SortDropdown.test.ts` gives the sort pairs.
 *
 * Without it: add a button and forget the key, and the grid filters and `?category=…` is published,
 * but reloading that shared link narrows it to `all` and shows the whole pool with no badge. The
 * `CategoryKey` type on `Category.value` catches it at build time; this catches the other
 * direction, a key with no button to press.
 */
describe('the category buttons and the query layer offer the same set', () => {
  it('offers a button for every key the URL will accept', () => {
    for (const { value } of CATEGORIES) {
      expect(toCategory(value), value).toBe(value);
    }
  });

  it('starts with the neutral option, which is what a reset and a bare URL both mean', () => {
    expect(CATEGORIES[0].value).toBe('all');
    expect(toCategory(undefined)).toBe('all');
  });

  it('narrows a value no button carries', () => {
    expect(CATEGORIES.map((c) => c.value)).not.toContain('collectibles');
    expect(toCategory('collectibles')).toBe('all');
  });
});
