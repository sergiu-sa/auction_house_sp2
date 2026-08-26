import { test, expect } from './support/fixtures';

/**
 * Counts are exact on purpose.
 * Every section here ranks the active pool, which the `listings-active` fixture records whole: 53 lots, 47 of them with bids, 128 bids in total.
 *
 * They were 2 / 2 / 2 and an active count of 2 while each surface fetched the newest 50 listings and filtered them in the browser.
 * If these numbers fall back towards 2, the query layer has been bypassed again;
 *  do not loosen the check to "non-zero", which passes the same either way.
 */
test('home renders every section at its measured card count', async ({
  page,
  mock,
}) => {
  await page.goto('/index.html');

  await expect(page.locator('#hero-mosaic article')).toHaveCount(3);
  await expect(page.locator('#trending-cards article')).toHaveCount(3);
  await expect(page.locator('#new-listings-cards article')).toHaveCount(3);
  await expect(page.locator('#ending-soon-cards article')).toHaveCount(4);
  await expect(page.locator('#catalog-cards article')).toHaveCount(12);

  // The stats describe the platform, not the fetched window.
  await expect(page.locator('#hero-active-count')).toHaveText('53');
  await expect(page.locator('#hero-bids-count')).toHaveText('128');
  expect(mock.consoleErrors).toEqual([]);
});

/** A search started on another page arrives as ?q= and used to be dropped on landing. */
test('home applies a search handed to it in the URL', async ({ page }) => {
  await page.goto('/index.html?q=vintage');

  await expect(page.locator('#global-search-input')).toHaveValue('vintage');
  await expect(page.locator('#catalog-cards article')).toHaveCount(12);
});

test.describe('empty catalog', () => {
  test.use({ listings: 'empty' });

  test('renders an empty state rather than a blank page', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('#hero-mosaic article')).toHaveCount(0);
    await expect(page.locator('#main-content')).toContainText(/no listings/i);
  });
});

test.describe('listings endpoint returns 500', () => {
  test.use({ listings: 'error' });

  test('surfaces an error state and keeps the page usable', async ({
    page,
  }) => {
    await page.goto('/index.html');
    await expect(page.locator('#header')).toBeVisible();
    await expect(page.locator('#main-content')).toContainText(
      /unable|error|failed|try again/i
    );
  });
});
