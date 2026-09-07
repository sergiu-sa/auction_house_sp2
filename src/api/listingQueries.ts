import { getListings, searchListings } from './listings';
import type { Listing } from '../types/api';
import { probeImages } from '../utils/imageProbe';
import { probeVariant } from '../utils/imageOptimization';

// Named queries express intent instead of assembling parameters.
// API behaviours: active pool fits in one request; _active=false is ignored;
// unknown sort is 500; search ignores _active and _tag.

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

// One request covers all active lots; small enough to rank in memory cheaply.
export async function activePool(): Promise<Listing[]> {
  return fetchWholeSet({
    _active: true,
    _seller: true,
    _bids: true,
    sort: 'created',
    sortOrder: 'desc',
  });
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

// Ranked by bids (API cannot sort by bid count). Pass pool to avoid refetching.
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

// Server can sort by created; fetches only needed rows when no pool provided.
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
    .sort(
      (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
    )
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

// Extra candidates to choose between; kept small to avoid wasted bandwidth.
const HERO_PROBE_MARGIN = 2;

// Measured on slow 4G; tighter budget produced a one-tile hero (worse than placeholder).
const HERO_PROBE_BUDGET_MS = 2500;

// Timeout is a macrotask; too little time left = all failures with no chance for hosts to answer.
const HERO_MIN_WAVE_MS = 250;

/** Under this a photograph is upscaled in any hero tile, so it is only used if nothing better verified. */
const HERO_MIN_GOOD_WIDTH = 600;

/** The main tile is roughly 3:1, so it wants a wide photograph rather than merely a large one. */
const HERO_MAIN_MIN_WIDTH = 800;

// Lots verified to have working photos; unverified ones filled from plain ranking.
// No placeholder here (unlike catalog); missing photo reads as page failure, not lot.
export async function featuredWithImages(
  limit: number,
  pool?: Listing[]
): Promise<Listing[]> {
  const ranked = await featuredActive(MAX_PAGE_SIZE, pool);
  const deadline = Date.now() + HERO_PROBE_BUDGET_MS;

  const chosen: HeroCandidate[] = [];
  const dead = new Set<Listing>();
  let next = 0;

  while (
    chosen.length < limit &&
    next < ranked.length &&
    deadline - Date.now() >= HERO_MIN_WAVE_MS
  ) {
    const need = limit - chosen.length;
    const wave = ranked.slice(next, next + need + HERO_PROBE_MARGIN);
    next += wave.length;

    const variants = wave.map((listing) =>
      probeVariant(listing.media?.[0]?.url ?? '')
    );
    const results = await probeImages(
      variants.map((variant) => variant.url),
      deadline - Date.now()
    );

    const verified: HeroCandidate[] = [];
    wave.forEach((listing, index) => {
      if (!results[index].ok) {
        // Timeout means budget ran out, not missing photo; stay eligible for fill.
        if (!results[index].timedOut) dead.add(listing);
        return;
      }
      verified.push({
        listing,
        width: results[index].width,
        height: results[index].height,
        resizable: variants[index].resizable,
      });
    });

    // Sort by sharpness (stable); prefer big photos but fill empty tiles anyway.
    verified.sort((a, b) => Number(isSharp(b)) - Number(isSharp(a)));
    chosen.push(...verified.slice(0, need));
  }

  // Settle mosaic wide tile before fill; unprobed lots can't judge aspect ratio.
  const widest = widestIndex(chosen);
  if (widest > 0) {
    const [main] = chosen.splice(widest, 1);
    chosen.unshift(main);
  }

  const featured = chosen.map((candidate) => candidate.listing);

  // Fill from ranking; unverified lots are what tiles used to be anyway.
  for (const listing of ranked) {
    if (featured.length >= limit) break;
    if (featured.includes(listing) || dead.has(listing)) continue;
    featured.push(listing);
  }

  // Empty hero would claim nothing's on; show ranking and let placeholder speak.
  if (featured.length === 0) return ranked.slice(0, limit);

  return featured;
}

interface HeroCandidate {
  listing: Listing;
  width: number;
  height: number;
  /** The probe asked a CDN for a small variant, so its width says nothing about the source. */
  resizable: boolean;
}

function isSharp(candidate: HeroCandidate): boolean {
  return candidate.resizable || candidate.width >= HERO_MIN_GOOD_WIDTH;
}

// Which candidate for the wide tile, or -1 to leave alone. Only arrangement changes.
function widestIndex(candidates: HeroCandidate[]): number {
  let best = -1;
  let bestAspect = 0;

  candidates.forEach((candidate, index) => {
    // A resized variant keeps the source's aspect, which is the only thing being compared here.
    if (!candidate.resizable && candidate.width < HERO_MAIN_MIN_WIDTH) return;
    const aspect = candidate.width / candidate.height;
    if (aspect > bestAspect) {
      bestAspect = aspect;
      best = index;
    }
  });

  return best;
}

// No "ended" filter, so sort descending by endsAt and skip active lots at the head.
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

// Search endpoint ignores _active and _tag; fetch smaller set and filter here when both present.
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

  if (term && tag) {
    const rows = await fetchWholeSet({
      _tag: tag,
      _seller: true,
      _bids: true,
    });
    const matches = rows.filter((listing) => matchesTerm(listing, term));

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
    const listings = response.data ?? [];

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

// Fetch all pages of a pre-filtered set (active pool, single tag). Not for unfiltered pool.
async function fetchWholeSet(
  params: Parameters<typeof getListings>[0]
): Promise<Listing[]> {
  const first = await getListings({ ...params, limit: MAX_PAGE_SIZE });
  const rows = [...(first.data ?? [])];
  const pageCount = first.meta?.pageCount ?? 1;

  if (pageCount > 1) {
    const rest = await Promise.all(
      Array.from({ length: pageCount - 1 }, (_, i) =>
        getListings({ ...params, limit: MAX_PAGE_SIZE, page: i + 2 })
      )
    );
    rest.forEach((response) => rows.push(...(response.data ?? [])));
  }

  return rows;
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
