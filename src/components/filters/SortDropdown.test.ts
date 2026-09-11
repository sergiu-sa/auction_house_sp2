import { describe, it, expect } from 'vitest';
import { SORT_OPTIONS } from './SortDropdown';
import { SORT_PRESETS } from '../../api/listingQueries';

/**
 * The dropdown owns the labels; `SORT_PRESETS` owns the vocabulary, because the URL parses against
 * it. Two lists that have to agree, so the agreement is asserted rather than commented: a preset
 * added without an option makes a URL the bar cannot display, and an option added without a preset
 * makes a filter the URL silently drops.
 */
describe('the sort dropdown and the query layer offer the same pairs', () => {
  it('lists exactly the presets, in the same order', () => {
    expect(SORT_OPTIONS.map(({ sort, order }) => ({ sort, order }))).toEqual([
      ...SORT_PRESETS,
    ]);
  });

  it('builds each option value from its own pair', () => {
    for (const option of SORT_OPTIONS) {
      expect(option.value).toBe(`${option.sort}-${option.order}`);
    }
  });

  it('gives every option a label', () => {
    for (const option of SORT_OPTIONS) {
      expect(option.label.trim()).not.toBe('');
    }
  });
});
