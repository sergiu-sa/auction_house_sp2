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
  await expect(page.locator('#catalog-cards article')).toHaveCount(11);

  // The stats describe the platform, not the fetched window.
  await expect(page.locator('#hero-active-count')).toHaveText('53');
  await expect(page.locator('#hero-bids-count')).toHaveText('128');
  expect(mock.consoleErrors).toEqual([]);
});

/**
 * A search started on another page arrives as ?q= and used to be dropped on landing.
 *
 * Both halves matter and the card count alone proves neither:
 *  the term has to reach the query (a filtered page is a different set of lots, not a smaller one), and the catalog's own reload must not overwrite the field the term landed in.
 */
/** 11 lots, not 12: the 12th grid cell is the next-page control. See collection.spec.ts. */
test('home applies a search handed to it in the URL', async ({ page }) => {
  await page.goto('/index.html');
  const unfiltered = await page
    .locator('#catalog-cards article h3')
    .first()
    .textContent();

  await page.goto('/index.html?q=vintage');

  await expect(page.locator('#catalog-search-input')).toHaveValue('vintage');
  await expect(page.locator('#catalog-cards article')).toHaveCount(11);
  await expect(
    page.locator('#catalog-cards article h3').first()
  ).not.toHaveText(unfiltered ?? '');
});

/**
 * "View Full Catalog" sits above the grid this bar drives and was a bare `/collection.html`, so a
 * reader who searched on Home and followed it landed on all 3,199 lots with an empty box — even
 * once Collection knew how to read `?q=`.
 *
 * `page` is deliberately absent: Home paginates 11 to a page and Collection 23, so the same number
 * means different lots. And the sort is measured against the *catalog's* resting `created desc`,
 * not Home's `endsAt asc`, or a reader who never touched it would arrive at a differently ordered
 * grid from the one they were reading.
 */
test('the catalog link carries the filters the reader set', async ({ page }) => {
  await page.goto('/index.html');
  const link = page.locator('#view-full-catalog');

  // An untouched Home already carries its sort, and that is the point rather than a leak: this
  // grid is ending-soon and the catalog's own resting order is newest-first, so a link that said
  // nothing would reorder the lots on the way. It is also the anchor — a specific value the surface
  // must produce before "it gained ?q=" can mean anything.
  await expect(page.locator('#catalog-cards article')).toHaveCount(11);
  await expect(link).toHaveAttribute(
    'href',
    '/collection.html?sort=endsAt&order=asc'
  );

  await page.locator('#catalog-search-input').fill('vintage');
  await expect(page.locator('#catalog-cards article')).toHaveCount(11);

  await expect(link).toHaveAttribute(
    'href',
    '/collection.html?q=vintage&sort=endsAt&order=asc'
  );
});

/**
 * The link drops the page number, and it has to: Home paginates 11 to a page and Collection 23, so
 * Home's page 2 is lots 12-22 and Collection's is 24-46. Carrying the number across would land the
 * reader on lots they had not reached.
 */
test('the catalog link does not carry the page number across', async ({
  page,
}) => {
  await page.goto('/index.html');
  await expect(page.locator('#catalog-cards article')).toHaveCount(11);

  await page.locator('#catalog-pagination').getByRole('button', { name: '2' }).click();
  // Anchored on the page having actually moved — the address bar is Home's own writer, and it does
  // publish the page, so this proves the state is on page 2 before the link is read.
  await expect.poll(() => new URL(page.url()).search).toBe('?page=2');

  await expect(page.locator('#view-full-catalog')).toHaveAttribute(
    'href',
    '/collection.html?sort=endsAt&order=asc'
  );
});

/**
 * One link changed, not every link to the catalog.
 *
 * Home has four in `main` — the hero CTA, Trending's and New Listings' "View All", and this one.
 * The first three sit above sections fed by the active pool, which the filter bar does not filter,
 * so carrying the catalog's filters there would describe a set those sections never showed.
 * Measured: eight on the rendered page, four of them the navbar's and the footer's, which are site
 * chrome and belong to no page's filters.
 */
test('only the link above the grid carries the filters', async ({ page }) => {
  await page.goto('/index.html');
  await page.locator('#catalog-search-input').fill('vintage');

  // Anchored on the one link having changed, so what follows is a division of a set that moved
  // rather than a count of four links nothing ever touched.
  await expect(page.locator('#view-full-catalog')).toHaveAttribute(
    'href',
    /\?q=vintage/
  );

  const inMain = page.locator('main a[href^="/collection.html"]');
  await expect(inMain).toHaveCount(4);
  await expect(
    page.locator('main a[href="/collection.html"]:not(#view-full-catalog)')
  ).toHaveCount(3);

  // Named, so a change that moved the filters onto a different link would fail rather than recount.
  expect(
    await inMain.evaluateAll((els) =>
      els.map((el) => el.textContent?.trim().replace(/\s+/g, ' '))
    )
  ).toEqual(['View live auctions', 'View All', 'View All', 'View Full Catalog']);

  await expect(
    page.locator(
      '#header a[href^="/collection.html"], footer a[href^="/collection.html"]'
    )
  ).toHaveCount(4);
  await expect(
    page.locator(
      '#header a[href="/collection.html"], footer a[href="/collection.html"]'
    )
  ).toHaveCount(4);
});

/**
 * A sort field the catalog does not offer must not override the page's own default.
 *
 * `toSortKey` collapses an unknown field to `created` — correct for a `<select>`, where an unknown
 * field is a 500 from the API, and wrong for a URL. Measured before it was strict:
 * `/index.html?sort=price&order=asc` selected `created-asc` ("Oldest first") and lit the filter
 * badge at 1, so a typo in a shared link silently reordered Home's grid and claimed the reader had
 * filtered it. Home is the page that shows it: its resting sort is `endsAt asc`, not `created`.
 */
test('a sort field the catalog does not offer leaves Home on its own', async ({
  page,
}) => {
  await page.goto('/index.html?sort=price&order=asc');

  await expect(page.locator('#catalog-cards article')).toHaveCount(11);
  await expect(page.locator('#catalog-sort-select')).toHaveValue('endsAt-asc');
  expect(
    await page
      .locator('#catalog-filters-count')
      .evaluate((el) => getComputedStyle(el).display)
  ).toBe('none');
  expect(new URL(page.url()).search).toBe('');
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

/**
 * Home used to carry two search boxes, and this pinned the term being mirrored between them.
 * There is one now, so what needs pinning is that it filters the catalog it sits above.
 *
 * On the title, not the count:
 *  the search fixture returns 12 rows and the page asks for 11, so a filtered page holds the same 11 cards as an unfiltered one and a count assertion passes either way.
 *
 * And asserted **positively**, against the first row of `listings-search-hit.json`, rather than as `not.toHaveText(theUnfilteredTitle)`.
 * Every refetch replaces the grid with skeletons that contain no `article` and no `h3`, and a negated matcher is satisfied by a locator that matches nothing;
 *   so the negated form goes green on any poll that lands inside the skeleton window.
 * Naming the row the filtered query must return cannot pass on an empty grid.
 *
 * The debounce's pending mark is covered by unit tests in `SearchField.test.ts`;
 *  set, cleared, and cancelled, which is where that behaviour is observable without a page around it.
 */
test('typing in the catalog search filters the catalog', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('#catalog-cards article')).toHaveCount(11);

  await page.locator('#catalog-search-input').fill('vintage');

  await expect(
    page.locator('#catalog-cards article h3').first()
  ).toHaveText('Yoann Siloine Polaroid Camera');
  await expect(page.locator('#catalog-search-input')).toHaveValue('vintage');
});
