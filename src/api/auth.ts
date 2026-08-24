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

  // Store token and user data in localStorage with proper timestamp
  if (response.data.accessToken) {
    setToken(response.data.accessToken);
    setUser(response.data);
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
