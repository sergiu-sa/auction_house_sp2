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

test('the results header reports the fetched window and the active total', async ({
  page,
}) => {
  await page.goto('/collection.html');
  // "50" is the fetch limit, not a real count, and it sits next to a tile reading 52 active lots.
  // Both numbers change once the query is fixed.
  await expect(page.locator('#results-count')).toHaveText('50');
  await expect(page.locator('#results-range')).toHaveText('1-24');
  await expect(page.locator('#active-lots-count')).toHaveText('52');
});

/** Search filters client-side over a 50-item window today, so these counts change once it moves to the server. */
test('search filters the rendered card set', async ({ page }) => {
  await page.goto('/collection.html');
  const grid = page.locator('#collection-cards-grid');
  await expect(grid.locator('article')).toHaveCount(24);

  await page.locator('#global-search-input').fill('vase');
  await expect(grid.locator('article')).toHaveCount(2);

  await page.locator('#global-search-input').fill('');
  await expect(grid.locator('article')).toHaveCount(24);
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
