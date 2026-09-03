import { api } from './config';
import type {
  Profile,
  UpdateProfileData,
  ApiResponse,
  Listing,
  Bid,
} from '../types/api';

/**
 * Get a profile by username.
 *
 * Every path here encodes the username:
 *  it arrives from `?user=` in the URL, and `apiClient` concatenates onto the base URL, so unencoded `..` segments normalise and steer the request to a different endpoint.
 */
export async function getProfile(
  username: string
): Promise<ApiResponse<Profile>> {
  return api.get<ApiResponse<Profile>>(
    `/auction/profiles/${encodeURIComponent(username)}`
  );
}

/**
 * Get profile listings (items user is selling)
 * @param username - Profile username
 */
export async function getProfileListings(
  username: string
): Promise<ApiResponse<Listing[]>> {
  return api.get<ApiResponse<Listing[]>>(
    `/auction/profiles/${encodeURIComponent(username)}/listings?_bids=true&_seller=true`
  );
}

/**
 * Get profile bids (items user has bid on)
 * @param username - Profile username
 */
export async function getProfileBids(
  username: string
): Promise<ApiResponse<Bid[]>> {
  return api.get<ApiResponse<Bid[]>>(
    `/auction/profiles/${encodeURIComponent(username)}/bids?_listings=true`
  );
}

/**
 * Get profile wins (auctions user has won)
 * @param username - Profile username
 */
export async function getProfileWins(
  username: string
): Promise<ApiResponse<Listing[]>> {
  return api.get<ApiResponse<Listing[]>>(
    `/auction/profiles/${encodeURIComponent(username)}/wins?_seller=true&_bids=true`
  );
}

/**
 * Update profile (requires authentication and ownership)
 * @param username - Profile username
 * @param profileData - Updated profile data
 */
export async function updateProfile(
  username: string,
  profileData: UpdateProfileData
): Promise<ApiResponse<Profile>> {
  return api.put<ApiResponse<Profile>>(
    `/auction/profiles/${encodeURIComponent(username)}`,
    profileData
  );
}
