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
