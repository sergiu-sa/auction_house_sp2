import { api } from '../api/config';
import type {
  User,
  UpdateProfileData,
  Listing,
  Bid,
  ApiResponse,
} from '../types/api';

/**
 * Get a profile by username
 * @param username - Profile username
 */
export async function getProfile(username: string): Promise<ApiResponse<User>> {
  return api.get<ApiResponse<User>>(`/auction/profiles/${username}`);
}

/**
 * Update user profile (requires authentication)
 * @param username - Profile username
 * @param profileData - Updated profile data
 */
export async function updateProfile(
  username: string,
  profileData: UpdateProfileData
): Promise<ApiResponse<User>> {
  const response = await api.put<ApiResponse<User>>(
    `/auction/profiles/${username}`,
    profileData
  );

  // Update user data in localStorage
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    const user = JSON.parse(storedUser);
    const updatedUser = { ...user, ...response.data };
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }

  return response;
}

/**
 * Get user's listings
 * @param username - Profile username
 */
export async function getProfileListings(
  username: string
): Promise<ApiResponse<Listing[]>> {
  return api.get<ApiResponse<Listing[]>>(
    `/auction/profiles/${username}/listings?_bids=true`
  );
}

/**
 * Get user's bids
 * @param username - Profile username
 */
export async function getProfileBids(
  username: string
): Promise<ApiResponse<Bid[]>> {
  return api.get<ApiResponse<Bid[]>>(
    `/auction/profiles/${username}/bids?_listings=true`
  );
}