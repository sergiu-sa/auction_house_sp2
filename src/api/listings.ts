import { api } from './config';
import type {
  Listing,
  CreateListingData,
  UpdateListingData,
  ApiResponse,
} from '../types/api';

/**
 * Get all listings with optional filters.
 *
 * Prefer the named queries in `listingQueries.ts`;
 *   they encode which combinations the API actually honours.
 * This is the transport underneath them.
 *
 * `_active` is deliberately only ever sent as `true`:
 *   the API ignores `_active=false` and answers with the whole pool, so an explicit "not active" cannot be asked for here.
 */
export async function getListings(params?: {
  limit?: number;
  page?: number;
  sort?: string;
  sortOrder?: 'asc' | 'desc';
  _seller?: boolean;
  _bids?: boolean;
  _active?: boolean;
  _tag?: string;
}): Promise<ApiResponse<Listing[]>> {
  const queryParams = new URLSearchParams();

  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.sort) queryParams.append('sort', params.sort);
  if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
  if (params?._seller) queryParams.append('_seller', 'true');
  if (params?._bids) queryParams.append('_bids', 'true');
  if (params?._active) queryParams.append('_active', 'true');
  if (params?._tag) queryParams.append('_tag', params._tag);

  const query = queryParams.toString();
  const endpoint = `/auction/listings${query ? `?${query}` : ''}`;

  return api.get<ApiResponse<Listing[]>>(endpoint);
}

/**
 * Full-text search.
 *
 * A separate endpoint because `/auction/listings` accepts `q` and silently ignores it, returning the entire pool as if every listing matched.
 * This one honours `q`, `sort`, `sortOrder`, `page`, `_seller` and `_bids` — but not `_active` or `_tag`, so those have to be applied to the result.
 *
 * `q` is required: the API rejects an empty or missing query with a 400.
 */
export async function searchListings(params: {
  q: string;
  limit?: number;
  page?: number;
  sort?: string;
  sortOrder?: 'asc' | 'desc';
  _seller?: boolean;
  _bids?: boolean;
}): Promise<ApiResponse<Listing[]>> {
  const queryParams = new URLSearchParams({ q: params.q });

  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.sort) queryParams.append('sort', params.sort);
  if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
  if (params._seller) queryParams.append('_seller', 'true');
  if (params._bids) queryParams.append('_bids', 'true');

  return api.get<ApiResponse<Listing[]>>(
    `/auction/listings/search?${queryParams.toString()}`
  );
}

/**
 * Get a single listing by ID
 * @param id - Listing ID
 */
export async function getListing(id: string): Promise<ApiResponse<Listing>> {
  return api.get<ApiResponse<Listing>>(
    `/auction/listings/${id}?_seller=true&_bids=true`
  );
}

/**
 * Create a new listing (requires authentication)
 * @param listingData - Listing data
 */
export async function createListing(
  listingData: CreateListingData
): Promise<ApiResponse<Listing>> {
  return api.post<ApiResponse<Listing>>('/auction/listings', listingData);
}

/**
 * Update a listing (requires authentication and ownership)
 * @param id - Listing ID
 * @param listingData - Updated listing data
 */
export async function updateListing(
  id: string,
  listingData: UpdateListingData
): Promise<ApiResponse<Listing>> {
  return api.put<ApiResponse<Listing>>(`/auction/listings/${id}`, listingData);
}

/**
 * Delete a listing (requires authentication and ownership)
 * @param id - Listing ID
 */
export async function deleteListing(id: string): Promise<void> {
  return api.delete<void>(`/auction/listings/${id}`);
}
