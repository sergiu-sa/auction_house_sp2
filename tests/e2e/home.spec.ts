import { test, expect } from './support/fixtures';

/**
 * Counts are exact on purpose.
 * Only 2 of the 50 fixture lots are still active, because each surface fetches the newest 50 and filters them client-side;
 *  that is a real bug, recorded here so a fix cannot land unnoticed.
 *
 * When listings are queried properly these numbers rise.
 * Update them then;
 *  do not loosen the check to "non-zero", which passes the same either way.
 */
test('home renders every section at its measured card count', async ({
  page,
  mock,
}) => {
  await page.goto('/index.html');

  await expect(page.locator('#hero-mosaic article')).toHaveCount(2);
  await expect(page.locator('#trending-cards article')).toHaveCount(2);
  await expect(page.locator('#new-listings-cards article')).toHaveCount(2);
  await expect(page.locator('#ending-soon-cards article')).toHaveCount(4);
  await expect(page.locator('#catalog-cards article')).toHaveCount(12);

  await expect(page.locator('#hero-active-count')).toHaveText('2');
  expect(mock.consoleErrors).toEqual([]);
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
