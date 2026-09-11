import { test, expect } from './support/fixtures';
import { IDS } from './support/mock';

/**
 * The container class is what matters, not the card class:
 *  the known list-view bug is cards re-rendered in grid form while the container stays single-column.
 */

const GRID_COLUMNS = 'sm:grid-cols-2';

/**
 * 23 lots, not 24: the 24th grid cell is the next-page control, and the fetch limit moves with the display count so no lot falls between pages.
 * The counter reads 1-23 then 24-46.
 * Exact on purpose, "non-zero" would pass either way, and the query layer's regressions all look like a plausible smaller number.
 */
test('grid and list views swap the container class, not just the cards', async ({
  page,
  mock,
}) => {
  await page.goto('/collection.html');
  const grid = page.locator('#collection-cards-grid');

  await expect(grid.locator('article')).toHaveCount(23);
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
  await expect(page.locator('#results-range')).toHaveText('1-23');
  await expect(page.locator('#active-lots-count')).toHaveText('52');
});

/** Active-only used to reach 50 of the 53 active lots, because the window was 50 wide. */
test('narrowing to active lots narrows the count with it', async ({ page }) => {
  await page.goto('/collection.html');

  // The panel is open at this viewport - it only collapses below `lg`.
  await page.locator('#catalog-active-only').check();

  await expect(page.locator('#results-count')).toHaveText('53');
  await expect(page.locator('#collection-cards-grid article')).toHaveCount(23);
});

/** Pagination is a server query now, so page 2 has to be different listings, not the same slice. */
test('paging asks the server for the next page', async ({ page }) => {
  await page.goto('/collection.html');
  const grid = page.locator('#collection-cards-grid');
  const firstOnPageOne = await grid.locator('article h3').first().textContent();

  await page.locator('#pagination').getByRole('button', { name: '2' }).click();

  await expect(grid.locator('article')).toHaveCount(23);
  await expect(page.locator('#results-range')).toHaveText('24-46');
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
  await expect(grid.locator('article')).toHaveCount(23);

  await page.locator('#catalog-search-input').fill('vase');
  await expect(grid.locator('article')).toHaveCount(12);
  await expect(page.locator('#results-count')).toHaveText('116');

  await page.locator('#catalog-search-input').fill('');
  await expect(grid.locator('article')).toHaveCount(23);
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
 * A search term handed to the catalog in the URL used to be dropped on the floor.
 *
 * Measured before the fix:
 *  `?q=` produced a request to `/auction/listings` carrying no `q` at all;
 *  not a filtered set, the whole catalog, so the page rendered 23 cards against a total of 3,199 with an empty search box.
 * The catalog could not be linked to, bookmarked at, or arrived at with a term, which is why nothing could send it one.
 *
 * **`#results-count` and the field value are what prove filtering happened**; the card count does not.
 * 12 is how many rows `listings-search-hit.json` holds, and the mock slices to `limit`, so 12 is the fixture's shape rather than evidence of a narrower set;
 *  against the live API a filtered first page holds 23 cards exactly like an unfiltered one.
 * It is asserted anyway because a change in the fixture's shape should fail loudly rather than quietly weaken the test around it.
 */
/**
 * The seed has to land before the first fetch, not after it.
 *
 * Both catalog pages do render bar → init → listen → seed → load, and nothing but a comment holds that order: move `seedSearchFromUrl()` below the load on either page and the unit suite stays green, because `src/pages/**` is excluded from coverage.
 * The visible symptom is two requests where there should be one, the first of them unfiltered;
 *  so count the requests rather than the cards, which look the same either way once the second lands.
 */
test('a URL term is in the first request, not a second one after it', async ({
  page,
}) => {
  const listingRequests: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/auction/listings')) listingRequests.push(r.url());
  });

  await page.goto('/collection.html?q=vintage');
  await expect(page.locator('#results-count')).toHaveText('116');

  const grid = listingRequests.filter((u) => !u.includes('_active=true'));
  expect(grid, grid.join('\n')).toHaveLength(1);
  expect(grid[0]).toContain('/auction/listings/search');
  expect(grid[0]).toContain('q=vintage');
});

test('the catalog applies a search handed to it in the URL', async ({
  page,
}) => {
  await page.goto('/collection.html?q=vintage');

  await expect(page.locator('#catalog-search-input')).toHaveValue('vintage');
  await expect(page.locator('#collection-cards-grid article')).toHaveCount(12);
  await expect(page.locator('#results-count')).toHaveText('116');
  await expect(page.locator('#results-range')).toHaveText('1-12');

  // A term arriving in the URL is a filter the reader did not set, so the badge has to own up to it.
  // Read through getComputedStyle: `[hidden]` is a UA rule and loses to the badge's own `inline-flex`, which is how it once shipped showing a literal 0.
  const badge = page.locator('#catalog-filters-count');
  await expect(badge).toHaveText('1');
  expect(await badge.evaluate((el) => getComputedStyle(el).display)).toBe(
    'inline-flex'
  );

  await page.locator('#clear-filters-btn').click();

  await expect(page.locator('#results-count')).toHaveText('3,199');
  await expect(page.locator('#catalog-search-input')).toHaveValue('');
  expect(await badge.evaluate((el) => getComputedStyle(el).display)).toBe(
    'none'
  );
});

/**
 * The catalog owns its search, in the bar pinned above the grid.
 * The navbar rendered a second field directly above it, same event, same state, mirrored value; so the two stacked and read as one control repeated.
 *
 * Home is the same shape now, and for the reason the navbar variant was retired:
 *  its field was above the fold and the grid it filtered was 4,204 px below, so typing changed 4,577 px of a 1440x900 viewport and every one of them was inside the input.
 * The per-page counts live in `pages.spec.ts`;
 *  these pin that no trace of the retired variant's markup came back.
 */
test('neither catalog surface renders the retired navbar search', async ({
  page,
}) => {
  for (const url of ['/collection.html', '/index.html']) {
    await page.goto(url);
    await expect(page.locator('#catalog-filter-bar')).toBeVisible();
    await expect(page.locator('#catalog-search-input')).toBeVisible();

    await expect(page.locator('#header-search-form')).toHaveCount(0);
    await expect(page.locator('#mobile-search-form')).toHaveCount(0);
    await expect(page.locator('#mobile-search-btn')).toHaveCount(0);
    await expect(page.locator('#mobile-search-bar')).toHaveCount(0);
    await expect(page.locator('#global-search-input')).toHaveCount(0);
    await expect(page.locator('#mobile-search-input')).toHaveCount(0);
  }
});

/**
 * Every page but the auth pages renders one navbar,  one component, not a set of arrangements to keep in step.
 * Home and the lot pages joined this when the search-carrying variant was retired:
 * measured, their nav links sat at x 804 and now sit at 561, which is where the catalog and the profile already had them.
 *
 * Measured on the *right* edge of the nav links, not the logo:
 *  the logo is first in the row, so it sits at the same x whatever the rest of the row does, and a check anchored to it passes over exactly the collapses it is meant to catch.
 */
test.describe('every page shares one navbar', () => {
  test.use({ auth: 'in' });

  test('same geometry, not a variant of its own', async ({ page }) => {
    const measure = async (
      path: string
    ): Promise<{ h: number; linksRight: number; logoLeft: number }> => {
      await page.goto(path);
      await page.locator('#header nav').first().waitFor();
      // main.css reserves #header's height, and that reservation clamps getBoundingClientRect, so `h` reads back the reserved number rather than the navbar's.
      // Measured: a navbar shrunk to 55px still reports 91.
      // Zero it first, exactly as main.css's own comment instructs.
      await page.addStyleTag({
        content: '#header { min-height: 0 !important }',
      });
      await page.evaluate(() => document.fonts.ready);
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

    for (const path of [
      '/profile.html',
      '/index.html',
      `/listing.html?id=${IDS.otherSeller}`,
      '/listing-create.html',
    ]) {
      expect(await measure(path), path).toEqual(collection);
    }

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

test('the last grid cell pages forward and lands on the results', async ({
  page,
}) => {
  await page.goto('/collection.html');
  const grid = page.locator('#collection-cards-grid');
  await expect(grid.locator('article')).toHaveCount(23);

  const firstOnPageOne = await grid.locator('article h3').first().textContent();
  await grid.locator('[data-next-page]').click();

  await expect(page.locator('#results-range')).toHaveText('24-46');
  await expect(grid.locator('article h3').first()).not.toHaveText(
    firstOnPageOne ?? ''
  );
  // F-058: the control that was focused no longer exists, so focus must be placed deliberately.
  await expect(grid).toBeFocused();
});

/** The field is the pager's own page number, so Enter is the whole interaction. */
test('the pager page number clamps past the end instead of erroring', async ({
  page,
}) => {
  await page.goto('/collection.html');
  const grid = page.locator('#collection-cards-grid');

  await page.locator('#pagination [data-page-jump-input]').fill('99999');
  await page.locator('#pagination [data-page-jump-input]').press('Enter');

  // Page 140 is past the 50 rows the fixture records, so the grid comes back empty and the cell is suppressed with it.
  // What this pins is the clamp: 99999 must land on the last page rather than erroring or being ignored, and #results-range is what proves where it landed.
  await expect(page.locator('#results-range')).toHaveText('0-0');
  await expect(grid.locator('[data-next-page]')).toHaveCount(0);
});

test('list view drops the cell and keeps the numbered pager', async ({
  page,
}) => {
  await page.goto('/collection.html');
  await page.locator('#list-view-btn').click();

  await expect(
    page.locator('#collection-cards-grid [data-next-page-cell]')
  ).toHaveCount(0);
  await expect(page.locator('#pagination')).toBeVisible();
});

/**
 * Page 140 is past the 50 rows the fixture records, so the grid empties and the cell is correctly suppressed.
 * Narrowing to the 53 active lots is the only route the mocked suite has to this tile.
 */
test('the last page offers a way back instead of a way on', async ({
  page,
}) => {
  await page.goto('/collection.html');
  await expect(
    page.locator('#collection-cards-grid article').first()
  ).toBeVisible();

  await page.locator('#catalog-active-only').check();
  await expect(page.locator('#results-count')).toHaveText('53');

  await page.locator('#pagination [data-page-jump-input]').fill('3');
  await page.locator('#pagination [data-page-jump-input]').press('Enter');

  await expect(page.locator('#results-range')).toHaveText('47-53');
  await expect(page.locator('[data-next-page]')).toHaveCount(0);

  const back = page.locator('[data-first-page]');
  await expect(back).toBeVisible();
  await back.click();
  await expect(page.locator('#results-range')).toHaveText('1-23');
});

/** The toggle re-renders the grid, so the cell has to come back on the way into grid view. */
test('the cell survives a trip through list view and back', async ({
  page,
}) => {
  await page.goto('/collection.html');
  const cell = page.locator('#collection-cards-grid [data-next-page-cell]');
  await expect(cell).toHaveCount(1);

  await page.locator('#list-view-btn').click();
  await expect(cell).toHaveCount(0);

  await page.locator('#grid-view-btn').click();
  await expect(cell).toHaveCount(1);
  await expect(page.locator('#collection-cards-grid article')).toHaveCount(23);
});

/**
 * The iOS path: the numeric keypad has no Return key, so blur has to commit or the field is unreachable there.
 * It also stops an abandoned edit disagreeing with the grid.
 */
test('the page number commits on blur, not only on Enter', async ({ page }) => {
  await page.goto('/collection.html');
  await expect(
    page.locator('#collection-cards-grid article').first()
  ).toBeVisible();

  const jump = page.locator('#pagination [data-page-jump-input]');
  await jump.fill('2');
  await page.locator('#results-count').click(); // blur, no Enter

  await expect(page.locator('#results-range')).toHaveText('24-46');
});

/**
 * The skeleton stands in for the finished grid, which holds one more box than it holds lots.
 * One cell short grew the grid 687px at 375 and pushed everything below it down.
 */
test('the loading skeleton reserves the cell as well as the cards', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/collection.html');
  await expect(
    page.locator('#collection-cards-grid article').first()
  ).toBeVisible();

  const rendered = await page.evaluate(
    () => document.getElementById('collection-cards-grid')!.children.length
  );

  await page.route('**/auction/listings?*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.fallback();
  });
  await page.locator('#refresh-listings-btn').click();

  // Settle, then count once. `expect.poll` retries until it passes, and the grid already holds the right rendered count before the refresh - so it would succeed without seeing a skeleton.
  const skeletonCells = await page.evaluate(async () => {
    const grid = document.getElementById('collection-cards-grid')!;
    await new Promise<void>((resolve) => {
      const check = (): void => {
        if (grid.firstElementChild?.tagName !== 'ARTICLE') return resolve();
        setTimeout(check, 50);
      };
      check();
    });
    return grid.children.length;
  });

  expect(skeletonCells).toBe(rendered);
});

/**
 * The "Can't Find What You're Looking For?" panel.
 *
 * It carried two `<button>` elements with no listener in either auth state; 
 * focusable, announced as buttons, and inert when pressed. axe could not see it: both had perfectly good accessible names.
 * "Create Alert" had no honest counterpart and is gone; "Contact Support" now reaches the address the footer already publishes.
 */
test('the catalog panel offers only a control that works', async ({ page }) => {
  await page.goto('/collection.html');

  await expect(page.getByRole('button', { name: 'Create Alert' })).toHaveCount(
    0
  );

  // A reachable address, and specifically not the invented aucto.app one it used to carry.
  const support = page.getByRole('link', { name: 'Contact Support' });
  await expect(support).toHaveAttribute('href', /^mailto:[^@]+@[^@]+\.[a-z]+$/);
  await expect(support).not.toHaveAttribute('href', /aucto\.app/);
});

/**
 * The panel also carried three figures nobody could stand behind;
 *  an average response time, a support window and a satisfaction rate.
 * There is no true version of any of them for this platform, so they are gone rather than restated, and the paragraph above
 * them no longer promises an alerts feature that does not exist.
 */
test('the catalog claims no figure it cannot stand behind', async ({
  page,
}) => {
  await page.goto('/collection.html');

  const main = page.locator('#main-content');
  for (const invented of [
    'AVG RESPONSE TIME',
    'SATISFACTION RATE',
    'SUPPORT AVAILABLE',
    '98%',
  ]) {
    await expect(main, invented).not.toContainText(invented);
  }
  await expect(main).not.toContainText('personalized alerts');
});
