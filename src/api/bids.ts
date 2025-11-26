import { api } from './config';
import type { Bid, CreateBidData, ApiResponse } from '../types/api';

/**
 * Place a bid on a listing (requires authentication)
 * @param listingId - Listing ID
 * @param bidData - Bid amount
 */
export async function placeBid(
  listingId: string,
  bidData: CreateBidData
): Promise<ApiResponse<Bid>> {
  return api.post<ApiResponse<Bid>>(
    `/auction/listings/${listingId}/bids`,
    bidData
  );
}

/**
 * Get all bids for a listing
 * @param listingId - Listing ID
 */
export async function getListingBids(
  listingId: string
): Promise<ApiResponse<Bid[]>> {
  return api.get<ApiResponse<Bid[]>>(
    `/auction/listings/${listingId}/bids?_bidder=true`
  );
}