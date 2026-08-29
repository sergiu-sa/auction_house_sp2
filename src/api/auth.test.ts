import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from './config';
import { login } from './auth';
import { getToken, getUser } from '../utils/storage';
import type { LoginResponse } from '../types/api';

vi.mock('./config', () => ({ api: { post: vi.fn() } }));

const mockedPost = vi.mocked(api.post);

const loginResponse: LoginResponse = {
  data: {
    name: 'bidder',
    email: 'bidder@stud.noroff.no',
    bio: null,
    avatar: null,
    banner: null,
    credits: 1000,
    accessToken: 'header.payload.signature',
  },
};

describe('login', () => {
  beforeEach(() => {
    localStorage.clear();
    mockedPost.mockReset();
    mockedPost.mockResolvedValue(loginResponse);
  });

  it('stores the token under its own key', async () => {
    await login({ email: 'bidder@stud.noroff.no', password: 'password123' });

    expect(getToken()).toBe('header.payload.signature');
  });

  /**
   * The API returns the token inside the same object as the profile fields.
   * Storing that object whole would leave the credential in two localStorage keys with nothing reading the second, and would make the stored user two different shapes depending on when it was last written.
   */
  it('keeps the token out of the stored user', async () => {
    await login({ email: 'bidder@stud.noroff.no', password: 'password123' });

    const stored = getUser();
    expect(stored).not.toBeNull();
    expect(Object.keys(stored ?? {})).not.toContain('accessToken');
  });

  it('stores the profile fields it was given', async () => {
    await login({ email: 'bidder@stud.noroff.no', password: 'password123' });

    expect(getUser()).toMatchObject({
      name: 'bidder',
      email: 'bidder@stud.noroff.no',
      credits: 1000,
    });
  });

  it('stores nothing when the response carries no token', async () => {
    mockedPost.mockResolvedValue({
      data: { ...loginResponse.data, accessToken: '' },
    });

    await login({ email: 'bidder@stud.noroff.no', password: 'password123' });

    expect(getToken()).toBeNull();
    expect(getUser()).toBeNull();
  });
});
