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

/**
 * The claims this site no longer makes.
 *
 * All of these rendered on every page or on the catalog, and every one was invented:
 * a support window, an average response time, a satisfaction rate, a phone number, a membership count.
 * They are pinned here because removed copy leaves nothing behind to fail;
 *   the footer half in particular was regenerated straight into the baselines.
 */
test.describe('logged out', () => {
  test('no page claims a figure nobody can stand behind', async ({ page }) => {
    for (const url of ['/index.html', '/collection.html', '/login.html']) {
      await page.goto(url);

      // A positive anchor first. Every string below lives in the JS-rendered footer, and a
      // negated matcher passes on its first poll, so without this the test would go green if
      // `renderFooter()` ever threw, went async, or lost its mount, while asserting nothing.
      const body = page.locator('body');
      await expect(page.locator('#footer a[href^="mailto:"]')).toHaveCount(1);

      for (const invented of [
        '24/7 Support Active',
        'Available 24/7',
        'support@aucto.app',
        '+47 123 45 678',
        '8,921 collectors',
        'Unsubscribe anytime',
      ]) {
        await expect(body, `${invented} on ${url}`).not.toContainText(invented);
      }
    }
  });
});
