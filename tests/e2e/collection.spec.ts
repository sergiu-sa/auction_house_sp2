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

  // The panel is open at this viewport - it only collapses below `lg`.
  await page.locator('#catalog-active-only').check();

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

  await page.locator('#catalog-search-input').fill('vase');
  await expect(grid.locator('article')).toHaveCount(12);
  await expect(page.locator('#results-count')).toHaveText('116');

  await page.locator('#catalog-search-input').fill('');
  await expect(grid.locator('article')).toHaveCount(24);
  await expect(page.locator('#results-count')).toHaveText('3,199');
});

test('a 136-character title is clamped instead of overflowing', async ({
  page,
}) => {
  await page.goto('/collection.html');
  const grid = page.locator('#collection-cards-grid');
  // It is not on page 1 of 24, so search it up rather than paginate to it.
  await page.locator('#catalog-search-input').fill('Testtesttest');
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

/**
 * The badge is `inline-flex`, and `[hidden]` is only a UA rule, so the utility silently won and an unfiltered catalog rendered a literal "0" beside the Filters button. jsdom cannot see this:
 * it has no Tailwind stylesheet, so the attribute alone looks correct there.
 */
test('the filter count badge is absent until something is filtered', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/collection.html');

  const badge = page.locator('#catalog-filters-count');
  await expect(page.locator('#catalog-filters-toggle')).toBeVisible();
  await expect(badge).toBeHidden();

  await page.locator('#catalog-filters-toggle').click();
  await page.locator('#catalog-active-only').check();

  await expect(badge).toBeVisible();
  await expect(badge).toHaveText('1');
});

/**
 * The catalog owns its search, in the bar pinned above the grid.
 * The navbar rendered a second field directly above it, same event, same state, mirrored value; so the two stacked and read as one control repeated.
 * Home keeps its navbar field: there the catalog is one section among several, and the field is the way into it rather than a duplicate of it.
 */
test('the catalog page has exactly one search field, and it is the bar’s', async ({
  page,
}) => {
  await page.goto('/collection.html');
  await expect(page.locator('#catalog-filter-bar')).toBeVisible();

  await expect(page.locator('input[type="search"]')).toHaveCount(1);
  await expect(page.locator('#catalog-search-input')).toBeVisible();
  await expect(page.locator('#header-search-form')).toHaveCount(0);
  await expect(page.locator('#mobile-search-btn')).toHaveCount(0);
  await expect(page.locator('#mobile-search-bar')).toHaveCount(0);
});

test('home keeps its navbar search alongside the catalog bar', async ({
  page,
}) => {
  await page.goto('/index.html');
  await expect(page.locator('#catalog-filter-bar')).toBeVisible();

  await expect(page.locator('#header-search-form')).toHaveCount(1);
  await expect(page.locator('#catalog-search-input')).toHaveCount(1);
});

/**
 * The catalog renders the same search-less navbar as the profile and listing-form pages rather than a variant of its own - one component, not a third arrangement to keep in step.
 * Pinned against profile, so a change to that shared navbar has to move both or neither.
 *
 * Measured on the *right* edge of the nav links, not the logo:
 *  the logo is first in the row, so it sits at the same x whatever the rest of the row does, and a check anchored to it passes over exactly the collapses it is meant to catch.
 */
test.describe('the catalog shares the profile navbar', () => {
  test.use({ auth: 'in' });

  test('same geometry, not a variant of its own', async ({ page }) => {
    const measure = async (
      path: string
    ): Promise<{ h: number; linksRight: number; logoLeft: number }> => {
      await page.goto(path);
      await page.locator('#header nav').first().waitFor();
      return page.evaluate(() => {
        const header = document.getElementById('header')!;
        const nav = document.querySelector('#header nav')!;
        const catalogLink = [...nav.querySelectorAll('a')].find((a) =>
          a.textContent?.includes('Catalog')
        )!;
        const logo = nav.querySelector('a[aria-label="Aucto home"]')!;
        return {
          h: Math.round(header.getBoundingClientRect().height),
          linksRight: Math.round(catalogLink.getBoundingClientRect().right),
          logoLeft: Math.round(logo.getBoundingClientRect().left),
        };
      });
    };

    const collection = await measure('/collection.html');
    const profile = await measure('/profile.html');

    expect(collection).toEqual(profile);
    // Spread across the row, not packed against the logo.
    expect(collection.linksRight).toBeGreaterThan(400);
  });
});

/**
 * Search is the primary action on a catalog page, so it stays in the always-visible row and the refinements go behind the button.
 * It briefly lived inside the collapsed panel, which put the catalog's only search field behind a control labelled "Filters";
 *  the one thing a reader looking for search will not think to open.
 */
test('search is usable on a narrow screen without opening anything', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/collection.html');

  const search = page.locator('#catalog-search-input');
  await expect(search).toBeVisible();
  // The refinements are still folded away at this width.
  await expect(page.locator('#catalog-sort-select')).toBeHidden();

  await search.fill('vase');
  // 116 is the whole matching set; the grid shows the fixture's 12 rows of it.
  await expect(page.locator('#results-count')).toHaveText('116');
});

/**
 * `aria-label` replaces the button's subtree as its accessible name, so the count badge inside it is never announced unless the name carries the number itself. axe cannot catch this, the button has a name either way, which is the same blind spot the placeholder's contrast hit.
 */
test('the filter count reaches the accessible name, not just the badge', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/collection.html');

  const toggle = page.locator('#catalog-filters-toggle');
  await expect(toggle).toHaveAttribute('aria-label', 'Filters');

  await toggle.click();
  await page.locator('#catalog-active-only').check();

  await expect(toggle).toHaveAttribute('aria-label', 'Filters, 1 applied');
});

/**
 * A failed load skips renderCurrentPage, which is where the bar was repainted.
 * The state has already moved by then, so the controls kept showing the filters the reader had just changed away from;
 *  and the next successful load would query with something the bar never showed.
 */
test('the bar still repaints when the catalog request fails', async ({
  page,
}) => {
  await page.goto('/collection.html');
  await expect(
    page.locator('#collection-cards-grid article').first()
  ).toBeVisible();

  await page.route('**/auction/listings**', (route) => route.abort());
  await page.locator('#catalog-active-only').check();

  await expect(page.locator('#catalog-filters-toggle')).toHaveAttribute(
    'aria-label',
    'Filters, 1 applied'
  );
  await expect(page.locator('#catalog-active-only')).toBeChecked();
});

/**
 * The pre-request repaint runs on every load and is the *only* repaint when one fails, so a summary left alone would advertise the previous filter set's total beside the new filters.
 */
test('the lot count does not outlive the filters it counted', async ({
  page,
}) => {
  await page.goto('/collection.html');
  await expect(page.locator('#catalog-filters-summary')).toHaveText(
    '3,199 lots'
  );

  await page.route('**/auction/listings**', (route) => route.abort());
  await page.locator('#catalog-active-only').check();

  await expect(page.locator('#catalog-filters-summary')).toHaveText('');
});

/**
 * Typing, then choosing a filter before the 300ms debounce elapses, used to discard the term silently:
 *  the filter change reloads, the repaint writes the old (empty) search over what was typed because focus had moved to the button, and the debounce then fires reading the overwritten field.
 * Measured: the box emptied and the results were of the category alone.
 * A focus check cannot catch this; the field has to say it is still holding keystrokes.
 */
test('a search term survives a filter clicked before the debounce fires', async ({
  page,
}) => {
  await page.goto('/collection.html');
  await expect(
    page.locator('#collection-cards-grid article').first()
  ).toBeVisible();

  await page.locator('#catalog-search-input').fill('vase');
  await page.locator('[data-catalog-filter="tech"]').click();

  await expect(page.locator('#catalog-search-input')).toHaveValue('vase');
  await expect(page.locator('#catalog-filters-toggle')).toHaveAttribute(
    'aria-label',
    'Filters, 2 applied'
  );
});

/**
 * Clear resets the page's own state and lets the reload repaint the bar from it;
 *  there is no longer a second event telling a navbar copy to reset itself, because the catalog page no longer has one.
 * Also pins the pending-keystroke flag's lifecycle:
 *   left set, it would block every later repaint of this field and the box would keep the cleared term.
 */
test('clear empties the search box and every other control', async ({
  page,
}) => {
  await page.goto('/collection.html');
  await page.locator('#catalog-search-input').fill('vase');
  await page.locator('#catalog-active-only').check();
  await expect(page.locator('#results-count')).not.toHaveText('3,199');

  await page.locator('#clear-filters-btn').click();

  await expect(page.locator('#catalog-search-input')).toHaveValue('');
  await expect(page.locator('#catalog-active-only')).not.toBeChecked();
  await expect(page.locator('#catalog-sort-select')).toHaveValue(
    'created-desc'
  );
  await expect(page.locator('#catalog-filters-toggle')).toHaveAttribute(
    'aria-label',
    'Filters'
  );
  await expect(page.locator('#results-count')).toHaveText('3,199');
});

/**
 * On this page the bar's field is the only search, and its placeholder disappears the moment the reader types. axe accepts a placeholder as an accessible name, so a field with nothing else passes the zero-violation scan while announcing nothing once it holds a value.
 */
test('the catalog search field announces a name that outlives the placeholder', async ({
  page,
}) => {
  await page.goto('/collection.html');

  const search = page.locator('#catalog-search-input');
  await expect(search).toHaveAttribute('aria-label', /\S/);

  await search.fill('vase');
  await expect(search).toHaveAttribute('aria-label', 'Search the catalog');
});
