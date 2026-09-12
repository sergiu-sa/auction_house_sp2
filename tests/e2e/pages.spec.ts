import { test, expect } from './support/fixtures';
import {
  GATED_PAGES,
  PUBLIC_PAGES,
  PUBLIC_PAGES_WHEN_SIGNED_IN,
  type PageCase,
} from './support/pages';

/**
 * Zero console errors on all 8 pages in both auth states is measured fact today, so it is asserted strictly.
 * Catches a page module throwing on import.
 */

/**
 * One search field per surface, and it is always the catalog bar's.
 *
 * This is the assertion the suite was missing.
 * A navbar variant carried a second search box on Home and a third on the lot pages, and nothing could express the problem:
 *  all three rendered, were named, passed axe and sat inside the visual baselines.
 * Measured before the fix:
 *  3 inputs on `index.html` with 2 visible at desktop, 2 on `listing.html` where nothing listened at all.
 *
 * Exact counts from `PageCase.searchFields`, never a ceiling:
 *  a page that rendered no navbar at all would satisfy "at most one".
 * The callers assert `ready` first for the same reason;
 *  establish that the page painted before counting what it did not paint.
 *
 * The landmark count rides along because it is the same number:
 *  the bar *is* the `role="search"` region, so one bar means one field and one landmark, and zero means zero.
 * Asserting it here rather than in its own pass covers all eight pages in both auth states instead of the five public ones, and costs no extra navigation;
 *   these loads were already happening.
 */
async function expectSearchSurface(
  page: import('@playwright/test').Page,
  page_: PageCase
): Promise<void> {
  await expect(
    page.locator('#header nav[aria-label="Main navigation"]')
  ).toBeVisible();

  await expect(
    page.locator('input[type="search"]'),
    page_.name
  ).toHaveCount(page_.searchFields);
  await expect(
    page.locator('#catalog-search-input'),
    page_.name
  ).toHaveCount(page_.searchFields);
  await expect(page.locator('[role="search"]'), page_.name).toHaveCount(
    page_.searchFields
  );
}

test.describe('logged out', () => {
  for (const page_ of PUBLIC_PAGES) {
    test(`${page_.name} loads clean, with the search surface it should have`, async ({
      page,
      mock,
    }) => {
      await page.goto(page_.url);
      await expect(page.locator(page_.ready)).toBeVisible();
      await expectSearchSurface(page, page_);
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

  for (const page_ of [...PUBLIC_PAGES_WHEN_SIGNED_IN, ...GATED_PAGES]) {
    test(`${page_.name} loads clean, with the search surface it should have`, async ({
      page,
      mock,
    }) => {
      await page.goto(page_.url);
      await expect(page.locator(page_.ready)).toBeVisible();
      await expectSearchSurface(page, page_);
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
