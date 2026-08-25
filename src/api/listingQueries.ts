import { getListings, searchListings } from './listings';
import type { Listing } from '../types/api';

/**
 * Named queries over the listings endpoints.
 *
 * Surfaces ask for intent — "the active pool", "what is closing next" — instead of assembling parameters.
 * That exists because every surface used to fetch the newest 50 listings and filter them in the browser, and only ~2% of the pool is active, so each one was wrong in its own way.
 *
 * Four API behaviours are measured, not assumed, and shape everything below:
 *
 * - The whole active pool fits in one request (53 of 3,200 lots, cap 100 per page).
 * - `_active=false` is ignored and returns the entire pool, so it is never sent, and there is no way to ask for ended lots directly.
 * - An unknown `sort` field is a 500, not a silent ignore — hence `toSortKey`.
 * - `/auction/listings/search` honours `q`, `sort`, `page` and the includes, but ignores `_active` and `_tag`.
 */

/** The API's own ceiling: `limit=101` is a 400. */
const MAX_PAGE_SIZE = 100;

const DEFAULT_PAGE_SIZE = 24;

export type SortKey = 'created' | 'endsAt' | 'title';
export type SortOrder = 'asc' | 'desc';

const SORT_KEYS: readonly SortKey[] = ['created', 'endsAt', 'title'];

export interface CatalogQuery {
  page?: number;
  limit?: number;
  sort?: SortKey;
  sortOrder?: SortOrder;
  activeOnly?: boolean;
  /** A tag name, or 'all'/empty for no category filter. */
  tag?: string;
  search?: string;
}

export interface CatalogResult {
  listings: Listing[];
  /** Size of the whole matching set, not of this page. */
  totalCount: number;
  pageCount: number;
}

/**
 * Narrow a sort field coming from a `<select>` to something the API accepts.
 * Anything else would come back as a 500.
 */
export function toSortKey(value: string | undefined): SortKey {
  return SORT_KEYS.includes(value as SortKey) ? (value as SortKey) : 'created';
}

export function toSortOrder(value: string | undefined): SortOrder {
  return value === 'asc' ? 'asc' : 'desc';
}

/**
 * Every currently-running auction.
 *
 * One request covers it, and the pool is small enough that ranking it in memory is both exact and cheaper than asking the server per surface.
 * Pages beyond the first are followed only if `meta.pageCount` says they exist.
 */
export async function activePool(): Promise<Listing[]> {
  const params = {
    limit: MAX_PAGE_SIZE,
    _active: true,
    _seller: true,
    _bids: true,
    sort: 'created',
    sortOrder: 'desc' as const,
  };

  const first = await getListings(params);
  const listings = [...(first.data ?? [])];

  const pageCount = first.meta?.pageCount ?? 1;
  if (pageCount > 1) {
    const rest = await Promise.all(
      Array.from({ length: pageCount - 1 }, (_, i) =>
        getListings({ ...params, page: i + 2 })
      )
    );
    rest.forEach((response) => listings.push(...(response.data ?? [])));
  }

  return listings;
}

/** The active total and the next lot to close, from `meta` rather than a row count. */
export async function activeStats(): Promise<{
  totalActive: number;
  nextToClose?: Listing;
}> {
  const response = await getListings({
    limit: 1,
    _active: true,
    sort: 'endsAt',
    sortOrder: 'asc',
  });

  const listings = response.data ?? [];

  return {
    totalActive: response.meta?.totalCount ?? listings.length,
    nextToClose: listings[0],
  };
}

/** The active lots closest to closing. A rank, not a time window. */
export async function endingSoon(limit: number): Promise<Listing[]> {
  const response = await getListings({
    limit,
    _active: true,
    _seller: true,
    _bids: true,
    sort: 'endsAt',
    sortOrder: 'asc',
  });

  return response.data ?? [];
}

/**
 * Active lots with the most bids. The API cannot sort by bid count;
 *   every spelling of it is a 500 — so this ranks the pool here.
 *
 * Pass `pool` when the caller already has it; a page rendering several rankings should fetch once.
 */
export async function trending(
  limit: number,
  pool?: Listing[]
): Promise<Listing[]> {
  const listings = pool ?? (await activePool());

  return [...listings]
    .filter((listing) => bidCount(listing) > 0)
    .sort((a, b) => bidCount(b) - bidCount(a))
    .slice(0, limit);
}

/**
 * The most recently created active lots.
 *
 * Unlike the bid-ranked queries this one the server can answer exactly, so without a pool it asks for just the rows it needs rather than pulling all of them.
 */
export async function newest(
  limit: number,
  pool?: Listing[]
): Promise<Listing[]> {
  const listings =
    pool ??
    (
      await getListings({
        limit,
        _active: true,
        _seller: true,
        _bids: true,
        sort: 'created',
        sortOrder: 'desc',
      })
    ).data ??
    [];

  return [...listings]
    .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
    .slice(0, limit);
}

/** Like `trending`, but keeps lots with no bids so the hero always fills. */
export async function featuredActive(
  limit: number,
  pool?: Listing[]
): Promise<Listing[]> {
  const listings = pool ?? (await activePool());

  return [...listings]
    .sort((a, b) => bidCount(b) - bidCount(a))
    .slice(0, limit);
}

/**
 * The lots that closed most recently, with at least one bid.
 *
 * There is no "ended" filter, so this sorts by `endsAt` descending and reads past the active lots at the head.
 * The window has to clear the whole active pool — at `limit: 50` it never did, and the caller silently fell back forever.
 */
export async function recentlyEnded(limit: number): Promise<Listing[]> {
  const response = await getListings({
    limit: MAX_PAGE_SIZE,
    sort: 'endsAt',
    sortOrder: 'desc',
    _seller: true,
    _bids: true,
  });

  const now = Date.now();

  return (response.data ?? [])
    .filter(
      (listing) =>
        new Date(listing.endsAt).getTime() < now &&
        (listing.bids?.length ?? 0) > 0
    )
    .slice(0, limit);
}

/**
 * One page of the catalog grid, however it is filtered.
 *
 * Three routes, because the API supports three different exact answers:
 *
 * 1. Search, active only — `/search` ignores `_active`, so the small side gets filtered instead: the active pool is 53 lots against 2,383 for a one-letter search term.
 * 2. Search, everything — the search endpoint, paginated server-side.
 *                         It ignores `_tag`, so a chosen category narrows the fetched page rather than the query;
 *                         that combination is the one case the API cannot answer exactly.
 * 3. No search — a plain server query, where `_active` and `_tag` compose.
 */
export async function catalogPage(
  query: CatalogQuery = {}
): Promise<CatalogResult> {
  const page = query.page ?? 1;
  const limit = query.limit ?? DEFAULT_PAGE_SIZE;
  const sort = query.sort ?? 'created';
  const sortOrder = query.sortOrder ?? 'desc';
  const tag = normaliseTag(query.tag);
  const term = query.search?.trim() ?? '';

  if (term && query.activeOnly) {
    const matches = (await activePool()).filter(
      (listing) => matchesTerm(listing, term) && matchesTag(listing, tag)
    );

    return paginate(sortListings(matches, sort, sortOrder), page, limit);
  }

  if (term) {
    const response = await searchListings({
      q: term,
      page,
      limit,
      sort,
      sortOrder,
      _seller: true,
      _bids: true,
    });
    const rows = response.data ?? [];
    const listings = tag
      ? rows.filter((listing) => matchesTag(listing, tag))
      : rows;

    return {
      listings,
      totalCount: response.meta?.totalCount ?? listings.length,
      pageCount: response.meta?.pageCount ?? 1,
    };
  }

  const response = await getListings({
    page,
    limit,
    sort,
    sortOrder,
    _seller: true,
    _bids: true,
    ...(query.activeOnly && { _active: true }),
    ...(tag && { _tag: tag }),
  });
  const listings = response.data ?? [];

  return {
    listings,
    totalCount: response.meta?.totalCount ?? listings.length,
    pageCount: response.meta?.pageCount ?? 1,
  };
}

function bidCount(listing: Listing): number {
  return listing._count?.bids ?? 0;
}

function normaliseTag(tag: string | undefined): string | undefined {
  const value = tag?.trim();
  return !value || value.toLowerCase() === 'all' ? undefined : value;
}

function matchesTag(listing: Listing, tag: string | undefined): boolean {
  if (!tag) return true;
  return (
    listing.tags?.some((t) => t.toLowerCase() === tag.toLowerCase()) ?? false
  );
}

function matchesTerm(listing: Listing, term: string): boolean {
  const needle = term.toLowerCase();
  return (
    listing.title.toLowerCase().includes(needle) ||
    (listing.description?.toLowerCase().includes(needle) ?? false)
  );
}

function sortListings(
  listings: Listing[],
  sort: SortKey,
  sortOrder: SortOrder
): Listing[] {
  const direction = sortOrder === 'asc' ? 1 : -1;

  return [...listings].sort((a, b) => {
    if (sort === 'title') {
      return a.title.localeCompare(b.title) * direction;
    }
    return (
      (new Date(a[sort]).getTime() - new Date(b[sort]).getTime()) * direction
    );
  });
}

function paginate(
  listings: Listing[],
  page: number,
  limit: number
): CatalogResult {
  return {
    listings: listings.slice((page - 1) * limit, page * limit),
    totalCount: listings.length,
    pageCount: Math.max(1, Math.ceil(listings.length / limit)),
  };
}
