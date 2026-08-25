import { test, expect } from './support/fixtures';

/**
 * The container class is what matters, not the card class:
 *  the known list-view bug is cards re-rendered in grid form while the container stays single-column.
 */

const GRID_COLUMNS = 'sm:grid-cols-2';

test('grid and list views swap the container class, not just the cards', async ({
  page,
  mock,
}) => {
  await page.goto('/collection.html');
  const grid = page.locator('#collection-cards-grid');

  await expect(grid.locator('article')).toHaveCount(24);
  await expect(grid).toHaveClass(new RegExp(GRID_COLUMNS));

  await page.locator('#list-view-btn').click();
  await expect(grid).not.toHaveClass(new RegExp(GRID_COLUMNS));
  await expect(grid).toHaveClass(/transition-all/);

  await page.locator('#grid-view-btn').click();
  await expect(grid).toHaveClass(new RegExp(GRID_COLUMNS));

  expect(mock.consoleErrors).toEqual([]);
});

/**
 * The counter reads the size of the matching set, from meta.totalCount.
 * It read "50" — the fetch limit — for every filter alike, next to a tile reading 52 active lots.
 */
test('the results header reports the whole matching set', async ({ page }) => {
  await page.goto('/collection.html');

  await expect(page.locator('#results-count')).toHaveText('3,199');
  await expect(page.locator('#results-range')).toHaveText('1-24');
  await expect(page.locator('#active-lots-count')).toHaveText('52');
});

/** Active-only used to reach 50 of the 53 active lots, because the window was 50 wide. */
test('narrowing to active lots narrows the count with it', async ({ page }) => {
  await page.goto('/collection.html');

  // The checkbox lives in the collapsed advanced-filters bar.
  await page.locator('#toggle-advanced-filters').click();
  await page.locator('#active-only-filter').check();

  await expect(page.locator('#results-count')).toHaveText('53');
  await expect(page.locator('#collection-cards-grid article')).toHaveCount(24);
});

/** Pagination is a server query now, so page 2 has to be different listings, not the same slice. */
test('paging asks the server for the next page', async ({ page }) => {
  await page.goto('/collection.html');
  const grid = page.locator('#collection-cards-grid');
  const firstOnPageOne = await grid.locator('article h3').first().textContent();

  await page.locator('#pagination').getByRole('button', { name: '2' }).click();

  await expect(grid.locator('article')).toHaveCount(24);
  await expect(page.locator('#results-range')).toHaveText('25-48');
  await expect(grid.locator('article h3').first()).not.toHaveText(
    firstOnPageOne ?? ''
  );
});

/**
 * Search goes to /auction/listings/search, which the plain listings endpoint only pretended to support.
 * It used to match within the fetched 50 and found 2.
 */
test('search filters the rendered card set', async ({ page }) => {
  await page.goto('/collection.html');
  const grid = page.locator('#collection-cards-grid');
  await expect(grid.locator('article')).toHaveCount(24);

  await page.locator('#global-search-input').fill('vase');
  await expect(grid.locator('article')).toHaveCount(12);
  await expect(page.locator('#results-count')).toHaveText('116');

  await page.locator('#global-search-input').fill('');
  await expect(grid.locator('article')).toHaveCount(24);
  await expect(page.locator('#results-count')).toHaveText('3,199');
});

test('a 136-character title is clamped instead of overflowing', async ({
  page,
}) => {
  await page.goto('/collection.html');
  const grid = page.locator('#collection-cards-grid');
  // It is not on page 1 of 24, so search it up rather than paginate to it.
  await page.locator('#global-search-input').fill('Testtesttest');
  const long = grid
    .locator('article')
    .filter({ hasText: 'Testtesttest' })
    .first();
  await expect(long).toBeVisible();

  // Card-vs-grid proves nothing: tracks are minmax(0, 1fr), so an item cannot exceed its column.
  // Overflow shows in the title box or as page scroll.
  const metrics = await page.evaluate(() => {
    const card = [
      ...document.querySelectorAll('#collection-cards-grid article'),
    ].find((a) => a.textContent?.includes('Testtesttest'));
    const title = card?.querySelector('h3');
    return {
      titleScrollWidth: title?.scrollWidth ?? 0,
      titleClientWidth: title?.clientWidth ?? 0,
      pageScrollWidth: document.documentElement.scrollWidth,
      pageClientWidth: document.documentElement.clientWidth,
    };
  });

  expect(metrics.titleScrollWidth).toBeLessThanOrEqual(
    metrics.titleClientWidth
  );
  expect(metrics.pageScrollWidth).toBeLessThanOrEqual(metrics.pageClientWidth);
});
