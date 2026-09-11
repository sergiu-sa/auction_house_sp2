import { toCategory, toSortPreset } from '../api/listingQueries';
import type { CatalogFilterState } from './catalogState';

/**
 * The catalog's URL contract: one serialiser, one parser, one list of keys.
 *
 * The two halves are here together because they are one thing — a key written and never read
 * resurrects a filter the reader cleared, and a key read and never written leaves the address bar
 * describing a grid that has moved on. Both shipped: `?q=` was read from the URL and never written
 * back, so clearing the filters left the term in the address bar for the next reload to restore.
 *
 * Six of the eight `CatalogFilterState` fields are here. The two that are not are the layout —
 * `itemsPerPage` has no control behind it at all (11 on Home, 23 on Collection, sized so the grid
 * plus its next-page cell divides by 1, 2, 3 and 4 columns), so a URL key would be its only editor;
 * and `viewMode` describes the reader rather than the lots, so two links showing the same set would
 * compare as different strings. That line is not a new one: `resetFilters` already carried those
 * two through untouched while resetting everything else. `page` is the one key here the filter
 * badge deliberately ignores — `countActiveFilters` counts the four the reader set, and where they
 * are in the results is not one of them.
 */
const KEYS = {
  search: 'q',
  category: 'category',
  activeOnly: 'active',
  sort: 'sort',
  sortOrder: 'order',
  page: 'page',
} as const;

/** Every key this module owns, for clearing ours out of a URL without touching anyone else's. */
export const CATALOG_URL_KEYS: readonly string[] = Object.values(KEYS);

/**
 * The query string for a set of filters, measured against the ones its page started on.
 *
 * Only what differs is written, so a catalog nobody has touched stays at a bare
 * `/collection.html` and clearing the filters empties the address bar rather than leaving a
 * spelt-out copy of the defaults behind.
 *
 * The defaults are an argument because the two catalogs do not share them: Home rests on
 * `endsAt asc` and Collection on `created desc`, so the same state is a changed sort on one page
 * and the resting state on the other.
 *
 * @returns `''`, or a string beginning with `?`.
 */
export function serializeCatalogState(
  state: CatalogFilterState,
  defaults: CatalogFilterState
): string {
  const params = new URLSearchParams();
  const term = state.search.trim();

  if (term !== defaults.search.trim()) params.set(KEYS.search, term);
  if (state.category !== defaults.category)
    params.set(KEYS.category, state.category);
  if (state.activeOnly !== defaults.activeOnly)
    params.set(KEYS.activeOnly, String(state.activeOnly));
  if (state.sort !== defaults.sort || state.sortOrder !== defaults.sortOrder) {
    params.set(KEYS.sort, state.sort);
    params.set(KEYS.sortOrder, state.sortOrder);
  }
  if (state.page !== defaults.page) params.set(KEYS.page, String(state.page));

  const query = params.toString();
  return query ? `?${query}` : '';
}

/**
 * The filters a URL is asking for — only the keys it actually carries, so the caller can seed them
 * over whatever its page already holds.
 *
 * Every value is narrowed, because this is the one input to the filter state that no control
 * produced. An unknown sort field is a 500 from the API; an unknown category is a 200 with nothing
 * in it, the grid empty and the badge counting a filter the bar cannot show.
 */
export function parseCatalogUrl(
  search: string = window.location.search
): Partial<CatalogFilterState> {
  const params = new URLSearchParams(search);
  const parsed: Partial<CatalogFilterState> = {};

  const term = params.get(KEYS.search)?.trim();
  if (term) parsed.search = term;

  const category = params.get(KEYS.category);
  if (category !== null) parsed.category = toCategory(category);

  // Only the affirmative is a filter: the default is off, so `active=false` is a URL asking for
  // nothing and `active=0` is a spelling this never writes.
  if (params.get(KEYS.activeOnly) === 'true') parsed.activeOnly = true;

  // The field opens the pair; a direction on its own would narrow to the default field and return
  // it as though the reader had chosen it. `toSortPreset` returns null for anything the dropdown
  // cannot show, which leaves the bar and the grid describing the same thing.
  const preset = toSortPreset(
    params.get(KEYS.sort),
    params.get(KEYS.sortOrder)
  );
  if (preset) {
    parsed.sort = preset.sort;
    parsed.sortOrder = preset.order;
  }

  const page = Number.parseInt(params.get(KEYS.page) ?? '', 10);
  if (Number.isFinite(page)) parsed.page = Math.max(1, page);

  return parsed;
}
