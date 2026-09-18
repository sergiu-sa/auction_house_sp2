import { test, expect } from './support/fixtures';
import { BROKEN_IMAGE_URL, loadFixture } from './support/mock';

/**
 * The login and register showcase: three of the newest active lots whose photographs load, or a drawing of paddles when there are not three.
 *
 * Both pages used to ship the tiles as HTML and repaint them by presentation class, which left product copy sitting over live lots:
 *  login kept an invented "Current bid: 520 credits" on lots with no bids at all, and register a "Seller tools" label over a lot's title.
 * The column now ships empty and every word on a tile is written from the lot beneath it.
 */
const SHOWCASE_PAGES = ['/login.html', '/register.html'];

type FixtureListing = {
  title: string;
  media?: { url: string; alt?: string }[];
};

for (const url of SHOWCASE_PAGES) {
  /**
   * Against the served HTML: main.css reserves the column with `:empty`, and a newline or comment between the tags is a child node that silently drops the reservation.
   * By the time the DOM can be read the showcase has already filled it, so the DOM cannot answer this.
   */
  test(`${url}: ships the showcase column empty, so its reserved height applies`, async ({
    request,
  }) => {
    const html = await (await request.get(url)).text();

    expect(html).toMatch(/<section\s+id="product-showcase"[^>]*><\/section>/);
  });

  test(`${url}: every word on the tiles describes the lot beneath it`, async ({
    page,
  }) => {
    await page.goto(url);

    const tile = (name: string, slot: string) =>
      page.locator(`[data-tile="${name}"] [data-slot="${slot}"]`);

    // The frozen clock makes the time left exact.
    await expect(tile('featured', 'title')).toHaveText('Travel Picture');
    await expect(tile('featured', 'time-left')).toHaveText('29d 22h 30m left');
    await expect(tile('featured', 'byline')).toHaveText(
      '@Seller64 • No bids yet'
    );
    await expect(tile('featured', 'description')).toHaveText(
      'This is a travel illustration someone famous made'
    );
    await expect(tile('tile-a', 'title')).toHaveText('Marina_ TEST [UPDATED]');
    await expect(tile('tile-a', 'byline')).toHaveText('@Seller28');
    await expect(tile('tile-a', 'meta')).toHaveText('2 bids • 68d 4h 20m left');
    await expect(tile('tile-b', 'title')).toHaveText('Milagros_ TEST [UPDATE]');
    await expect(tile('tile-b', 'meta')).toHaveText('1 bid • 25d 2h 5m left');
  });
}

test('a lot whose photograph will not load is passed over, not shown with a placeholder', async ({
  page,
}) => {
  // The first twenty rows are what the default mock serves for this request, so only the two newest lots differ.
  const rows = loadFixture<{ data: FixtureListing[] }>(
    'listings-active'
  ).data.slice(0, 20);
  for (const row of rows) {
    if (row.title === 'Travel Picture') row.media = [{ url: BROKEN_IMAGE_URL }];
    if (row.title === 'Marina_ TEST [UPDATED]') row.media = [];
  }
  await page.route(/\/auction\/listings\?/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: rows, meta: {} }),
    })
  );

  await page.goto('/login.html');

  const titles = page.locator('#product-showcase [data-slot="title"]');
  await expect(titles).toHaveText([
    'Milagros_ TEST [UPDATE]',
    'Pee in pools cap',
    'Vans',
  ]);
  const sources = await page
    .locator('#product-showcase img')
    .evaluateAll((images) => images.map((img) => img.getAttribute('src')));
  expect(sources).toHaveLength(3);
  expect(sources.some((src) => src?.includes('placeholder'))).toBe(false);
  expect(sources).not.toContain(BROKEN_IMAGE_URL);
});

test('with no lots to show, the paddles take the column and no image is left to fail', async ({
  page,
}) => {
  await page.route(/\/auction\/listings\?/, (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: '{"errors":[]}',
    })
  );

  await page.goto('/register.html');

  await expect(
    page.locator('#product-showcase[data-showcase="paddles"] svg')
  ).toBeVisible();
  await expect(page.locator('#product-showcase img')).toHaveCount(0);
});

/**
 * Against the served HTML, not the DOM:
 *  a counter the page removes at runtime would pass a DOM check whether or not the page ships the invented figure.
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
