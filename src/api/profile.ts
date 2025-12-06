import { api } from './config';
import type {
  Profile,
  UpdateProfileData,
  ApiResponse,
  Listing,
  Bid,
} from '../types/api';

/**
 * Get a profile by username
 * @param username - Profile username
 */
export async function getProfile(username: string): Promise<ApiResponse<Profile>> {
  return api.get<ApiResponse<Profile>>(
    `/auction/profiles/${username}?_listings=true&_wins=true`
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
    `/auction/profiles/${username}/listings?_bids=true&_seller=true`
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
    `/auction/profiles/${username}/bids?_listings=true`
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
    `/auction/profiles/${username}/wins?_seller=true&_bids=true`
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
    `/auction/profiles/${username}`,
    profileData
  );
}
