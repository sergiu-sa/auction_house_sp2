import { api } from './config';
import type {
  Listing,
  CreateListingData,
  UpdateListingData,
  ApiResponse,
} from '../types/api';

/**
 * Get all listings with optional search and filters
 * @param params - Query parameters for filtering and pagination
 */
export async function getListings(params?: {
  search?: string;
  limit?: number;
  page?: number;
  sort?: string;
  sortOrder?: 'asc' | 'desc';
  _seller?: boolean;
  _bids?: boolean;
  _active?: boolean;
}): Promise<ApiResponse<Listing[]>> {
  const queryParams = new URLSearchParams();

  if (params?.search) queryParams.append('q', params.search);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.sort) queryParams.append('sort', params.sort);
  if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
  if (params?._seller) queryParams.append('_seller', 'true');
  if (params?._bids) queryParams.append('_bids', 'true');
  if (params?._active) queryParams.append('_active', 'true');

  const query = queryParams.toString();
  const endpoint = `/auction/listings${query ? `?${query}` : ''}`;

  return api.get<ApiResponse<Listing[]>>(endpoint);
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
