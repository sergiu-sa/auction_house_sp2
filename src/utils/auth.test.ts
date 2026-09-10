import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { profileHref } from './auth';
import { setToken, setUser, clearAuth } from './storage';
import type { User } from '../types/api';

const USER: User = {
  name: 'bidder',
  email: 'bidder@stud.noroff.no',
  credits: 1000,
};

describe('profileHref', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => clearAuth());

  it('goes straight to the profile for a signed-in reader', () => {
    setToken('header.payload.signature');
    setUser(USER);

    expect(profileHref('Seller13')).toBe('/profile.html?user=Seller13');
  });

  /**
   * Every `/auction/profiles/*` route is 401 without a token, so a guest following a seller link used to land on the session-expired toast and a redirect they did not ask for.
   */
  it('sends a guest to log in, with the profile as the return url', () => {
    expect(profileHref('Seller13')).toBe(
      '/login.html?redirect=%2Fprofile.html%3Fuser%3DSeller13'
    );
  });

  /**
   * The return url has to be encoded, unlike the navbar's:
   *  this one carries a query string of its own, and an unencoded `?user=` would be read as a second parameter of the *login* url.
   */
  it('encodes the return url so its own query survives', () => {
    const href = profileHref('Seller13');
    const redirect = new URL(href, 'https://x.invalid').searchParams.get(
      'redirect'
    );

    expect(redirect).toBe('/profile.html?user=Seller13');
  });

  it('encodes a username that would otherwise break the url', () => {
    setToken('header.payload.signature');
    setUser(USER);

    expect(profileHref('a b&c=d')).toBe('/profile.html?user=a%20b%26c%3Dd');
  });
});
