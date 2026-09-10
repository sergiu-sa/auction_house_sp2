import { test, expect } from './support/fixtures';

/**
 * The login and register showcases ship their tiles' markup in the HTML and let `ProductShowcase` repaint the slots from the newest live lots.
 * It matches those slots by presentation class, so an element the page also drives by id can sit inside one and be destroyed by the first repaint.
 *
 * That happened:
 *  `#active-users` on register carried a `Math.random()` interval, and the repaint removed the span before the first tick was ever visible;
 *  leaving a timer writing to a detached node for the life of the page, and the label "Active now" sitting over a listing title.
 *
 * Nothing else in the suite could see it.
 * The element rendered, it was named, it passed axe, and the visual baseline masked it with a locator that had long since matched zero elements.
 */
const SHOWCASE_PAGES = ['/login.html', '/register.html'];

/**
 * What the page *ships* inside its tiles, read from the served HTML rather than the DOM.
 *
 * Reading it from the DOM is the trap:
 *  `goto` resolves on `load`, by which point the repaint has already run under mocks, so a destroyed id is simply absent from the "before" list and the assertion below passes over the exact defect it was written for.
 */
async function shippedTiles(
  request: import('@playwright/test').APIRequestContext,
  url: string
): Promise<{ ids: string[]; featuredHeadline: string }> {
  const html = await (await request.get(url)).text();
  const tiles =
    html.match(/<article[^>]*\bdata-tile=[\s\S]*?<\/article>/g) ?? [];
  const featured = tiles.find((t) => t.includes('data-tile="featured"')) ?? '';

  // Scoped to the tile, not the document.
  // Both auth pages carry an `<h1 class="font-serif">` above the showcase, so a document-wide search finds that instead, and the poll below then compares two different elements, passes on its first tick, and stops waiting for the repaint it exists to wait for.
  // It did exactly that until this was scoped.
  const featuredHeadline =
    featured
      .match(/<h[1-3][^>]*\bfont-serif\b[^>]*>([\s\S]*?)<\/h[1-3]>/)?.[1]
      ?.replace(/\s+/g, ' ')
      .trim() ?? '';

  return {
    ids: tiles.flatMap((tile) =>
      Array.from(tile.matchAll(/\bid="([^"]+)"/g), (m) => m[1])
    ),
    featuredHeadline,
  };
}

for (const url of SHOWCASE_PAGES) {
  test(`${url}: every id inside a showcase tile survives the repaint`, async ({
    page,
    request,
  }) => {
    const { ids, featuredHeadline } = await shippedTiles(request, url);
    expect(ids.length).toBeGreaterThan(0);
    expect(featuredHeadline).not.toBe('');

    await page.goto(url);

    // A content signal, not a timer:
    //  `updateFeaturedTile` assigns this headline unconditionally from the fetched lot, so the DOM differing from the shipped HTML means the repaint has run.
    await expect
      .poll(() =>
        page
          .locator('[data-tile="featured"] .font-serif')
          .textContent()
          .then((t) => t?.replace(/\s+/g, ' ').trim())
      )
      .not.toBe(featuredHeadline);

    const missing = await page.evaluate(
      (list) => list.filter((id) => !document.getElementById(id)),
      ids
    );
    expect(missing, `ids destroyed by the showcase repaint on ${url}`).toEqual(
      []
    );
  });
}

/**
 * Against the served HTML, not the DOM:
 *  the repaint deletes the span and rewrites the line, so both assertions pass at runtime whether or not the page ships the invented figure.
 * Written against the DOM first, this test passed with the defect put back.
 *
 * Comments are *not* stripped, and that is the point.
 * An earlier version stripped them so the markup could keep a comment quoting the old line,
 *  but Vite copies HTML comments into the build, so the string was still there in `dist/register.html` and the assertion had been made blind to the one thing it forbids.
 */
test('register ships no invented member count', async ({ request }) => {
  const html = await (await request.get('/register.html')).text();

  expect(html).not.toContain('id="active-users"');
  expect(html).not.toContain('members online');
});

/**
 * The featured tile's bid figure, which no recorded fixture exercises.
 *
 * `updateFeaturedTile` writes `#featured-bid` only on login and only when the newest active lot has bids;
 *   and the newest lot in `listings-active.json` has none, so the branch never runs and neither the smoke suite nor the baselines can see what it renders.
 * The route is overridden here for the same reason `profile.spec.ts` overrides its own:
 *  the recorded pool cannot produce the state, so the state has to be built.
 */
test('the login showcase groups a four-figure bid', async ({ page, mock }) => {
  const lot = {
    id: 'deadbeef-5555-4777-8888-999900001111',
    title: 'A richly bid lot',
    description: 'Something expensive',
    media: [],
    tags: [],
    created: '2099-01-01T00:00:00.000Z',
    updated: '2099-01-01T00:00:00.000Z',
    endsAt: '2099-06-01T00:00:00.000Z',
    _count: { bids: 1 },
    seller: { name: 'Seller13' },
    bids: [
      {
        id: 'bid-rich',
        amount: 1002,
        created: '2026-01-01T00:00:00.000Z',
        bidder: { name: 'Seller04' },
      },
    ],
  };

  await page.route(/\/auction\/listings\?/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [lot],
        meta: {
          pageCount: 1,
          totalCount: 1,
          isFirstPage: true,
          isLastPage: true,
        },
      }),
    })
  );

  await page.goto('/login.html');

  await expect(page.locator('#featured-bid')).toHaveText('1,002');

  expect(mock.consoleErrors).toEqual([]);
});
