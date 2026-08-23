import { test, expect } from './support/fixtures';
import { IDS } from './support/mock';

/**
 * Zero console errors on all 8 pages in both auth states is measured fact today, so it is asserted strictly.
 * Catches a page module throwing on import.
 */

interface PageCase {
  name: string;
  url: string;
  /** Something only that page renders, proving it got past its data load. */
  ready: string;
}

const PUBLIC_PAGES: PageCase[] = [
  { name: 'home', url: '/index.html', ready: '#hero-mosaic' },
  {
    name: 'collection',
    url: '/collection.html',
    ready: '#collection-cards-grid',
  },
  {
    name: 'listing detail',
    url: `/listing.html?id=${IDS.otherSeller}`,
    ready: '#listing-details',
  },
  { name: 'login', url: '/login.html', ready: '#login-form' },
  { name: 'register', url: '/register.html', ready: '#register-form' },
];

const GATED_PAGES: PageCase[] = [
  { name: 'profile', url: '/profile.html', ready: '#profile-content' },
  {
    name: 'listing create',
    url: '/listing-create.html',
    ready: '#create-listing-content',
  },
  {
    name: 'listing edit',
    url: `/listing-edit.html?id=${IDS.own}`,
    ready: '#edit-listing-content',
  },
];

test.describe('logged out', () => {
  for (const page_ of PUBLIC_PAGES) {
    test(`${page_.name} loads with no console errors`, async ({
      page,
      mock,
    }) => {
      await page.goto(page_.url);
      await expect(page.locator(page_.ready)).toBeVisible();
      expect(mock.consoleErrors).toEqual([]);
    });
  }

  for (const page_ of GATED_PAGES) {
    test(`${page_.name} redirects to login, preserving the return url`, async ({
      page,
      mock,
    }) => {
      await page.goto(page_.url);
      await page.waitForURL(/login\.html/);
      const redirect = new URL(page.url()).searchParams.get('redirect');
      expect(
        redirect,
        'protectedRoute() must round-trip the requested url'
      ).toContain(page_.url.split('?')[0]);
      await expect(page.locator('#login-form')).toBeVisible();
      expect(mock.consoleErrors).toEqual([]);
    });
  }
});

test.describe('logged in', () => {
  test.use({ auth: 'in' });

  for (const page_ of [...PUBLIC_PAGES.slice(0, 3), ...GATED_PAGES]) {
    test(`${page_.name} loads with no console errors`, async ({
      page,
      mock,
    }) => {
      await page.goto(page_.url);
      await expect(page.locator(page_.ready)).toBeVisible();
      expect(mock.consoleErrors).toEqual([]);
    });
  }

  test('login and register bounce an authenticated user home', async ({
    page,
    mock,
  }) => {
    for (const url of ['/login.html', '/register.html']) {
      await page.goto(url);
      await page.waitForURL(/index\.html/);
    }
    expect(mock.consoleErrors).toEqual([]);
  });
});
