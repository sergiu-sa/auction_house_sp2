import { api } from './config';
import { setToken, setUser, clearAuth } from '../utils/storage';
import type {
  LoginResponse,
  RegisterData,
  LoginData,
  ApiResponse,
} from '../types/api';

/**
 * Register a new user
 * Email must end with @stud.noroff.no
 */
export async function register(
  userData: RegisterData
): Promise<ApiResponse<{ name: string; email: string }>> {
  return api.post<ApiResponse<{ name: string; email: string }>>(
    '/auth/register',
    userData
  );
}

/**
 * Login user and receive access token
 */
export async function login(credentials: LoginData): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', credentials);

  if (response.data.accessToken) {
    // The token is kept out of the stored user deliberately:
    //  it has its own key, nothing reads a copy inside `user`, and storing it twice only gives the credential a second place to leak from.
    const { accessToken, ...user } = response.data;
    setToken(accessToken);
    setUser(user);
  }

  return response;
}

/**
 * Logout user (clear local storage)
 */
export function logout(): void {
  // Use clearAuth to properly remove all auth data including timestamp
  clearAuth();
  window.location.href = '/index.html';
}
