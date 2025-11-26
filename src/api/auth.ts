import { api } from './config';
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

  // Store token and user data in localStorage
  if (response.data.accessToken) {
    localStorage.setItem('token', response.data.accessToken);
    localStorage.setItem('user', JSON.stringify(response.data));
  }

  return response;
}

/**
 * Logout user (clear local storage)
 */
export function logout(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/index.html';
}