import { test, expect } from './support/fixtures';
import type { Page } from '@playwright/test';
import { BROKEN_IMAGE_URL, IDS, loadFixture } from './support/mock';

/**
 * F-088/F-089: what a lot shows when it has no usable photograph.
 *
 * The mock answers BROKEN_IMAGE_URL with 200 and an HTML body, which fires the image's `error` event exactly as a 404 does without logging a console error.
 */

const PLACEHOLDER = '/images/placeholder.svg';

interface ActivePool {
  data: Array<Record<string, unknown>>;
  meta: Record<string, unknown>;
}

/** Serve the active pool with `mutate` applied, so each test shows only what it changed. */
async function serveActivePool(
  page: Page,
  mutate: (pool: ActivePool) => void
): Promise<void> {
  const listings = loadFixture<ActivePool>('listings-active');
  mutate(listings);
  await page.route('**/auction/listings?**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(listings),
    })
  );
}

test('a lot whose image URL is dead falls back to the placeholder on a card', async ({
  page,
  mock,
}) => {
  await serveActivePool(page, (pool) => {
    pool.data[0].media = [{ url: BROKEN_IMAGE_URL, alt: 'Item image' }];
  });
  await page.goto('/collection.html');

  const first = page.locator('#collection-cards-grid img').first();
  await expect(first).toHaveAttribute('src', PLACEHOLDER);
  // The alt is left alone:
  //  this image is the whole content of its link, so emptying it would leave that link with no accessible name.
  await expect(first).not.toHaveAttribute('alt', '');

  expect(mock.consoleErrors).toEqual([]);
});

test('a lot with no media at all shows the same placeholder, not a stock photo', async ({
  page,
  mock,
}) => {
  await page.goto(`/listing.html?id=${IDS.noMedia}`);

  const main = page.locator('#main-image');
  await expect(main).toHaveAttribute('src', PLACEHOLDER);
  // One thumbnail, so the reserved row does not collapse, and it is not an inert control:
  //  clicking it swaps in the same placeholder rather than hitting a falsy url and doing nothing.
  const thumb = page.locator('.thumbnail-btn');
  await expect(thumb).toHaveCount(1);
  await expect(thumb).toHaveAttribute('data-image-url', PLACEHOLDER);
  // With no media of its own the lot is named by its title, not by a photograph's caption.
  await expect(main).toHaveAttribute('alt', 'Lot With No Media At All');
  // F-089: the hardcoded Unsplash photograph is gone.
  await expect(main).not.toHaveAttribute('src', /unsplash/);

  expect(mock.consoleErrors).toEqual([]);
});

test('the detail gallery falls back on the main image and every thumbnail', async ({
  page,
  mock,
}) => {
  await page.goto(`/listing.html?id=${IDS.brokenImage}`);

  await expect(page.locator('#main-image')).toHaveAttribute(
    'src',
    PLACEHOLDER
  );
  const thumbs = page.locator('.thumbnail-btn img');
  await expect(thumbs).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    await expect(thumbs.nth(i)).toHaveAttribute('src', PLACEHOLDER);
  }

  expect(mock.consoleErrors).toEqual([]);
});

test('clicking a thumbnail whose image is dead still falls back', async ({
  page,
  mock,
}) => {
  // The re-arm case:
  //  onImageError latches after the first failure, so a gallery that swaps `src` on click has to re-arm or the second dead image renders as alt-text-on-grey.
  await page.goto(`/listing.html?id=${IDS.brokenImage}`);

  await page.locator('.thumbnail-btn').nth(1).click();

  await expect(page.locator('#main-image')).toHaveAttribute(
    'src',
    PLACEHOLDER
  );

  expect(mock.consoleErrors).toEqual([]);
});

test('a dead seller avatar reveals the initial letter, not alt text', async ({
  page,
  mock,
}) => {
  await page.goto(`/listing.html?id=${IDS.brokenImage}`);

  const avatar = page.locator('#seller-profile img');
  const fallback = page.locator('#seller-profile [data-identity-fallback]');
  await expect(fallback).toBeVisible();
  await expect(avatar).toBeHidden();

  expect(mock.consoleErrors).toEqual([]);
});

test('the hero skips lots whose photograph will not load', async ({
  page,
  mock,
}) => {
  // The live shape of the problem:
  //  the two highest-bid lots are the ones with dead images, so ranking by bids surfaced two "no image" plates for as long as those auctions ran.
  const deadTitles: string[] = [];
  await serveActivePool(page, (pool) => {
    const byBids = [...pool.data].sort(
      (a, b) =>
        ((b._count as { bids: number })?.bids ?? 0) -
        ((a._count as { bids: number })?.bids ?? 0)
    );
    for (const lot of byBids.slice(0, 2)) {
      lot.media = [{ url: BROKEN_IMAGE_URL, alt: 'Item image' }];
      deadTitles.push(lot.title as string);
    }
  });

  await page.goto('/index.html');
  await expect(page.locator('#hero-mosaic article').first()).toBeVisible();

  const mosaic = page.locator('#hero-mosaic');
  await expect(mosaic.locator('img')).toHaveCount(3);
  // Not one placeholder in the hero, and neither dead lot made it in.
  await expect(mosaic.locator(`img[src="${PLACEHOLDER}"]`)).toHaveCount(0);
  for (const title of deadTitles) {
    await expect(mosaic).not.toContainText(title);
  }

  expect(mock.consoleErrors).toEqual([]);
});

test('no image anywhere on home is left rendering as alt text', async ({
  page,
  mock,
}) => {
  // The page-wide statement of the convention:
  //  every lot image has either loaded or been replaced, and the hero holds no placeholder because it only picks lots whose photograph works.
  await page.goto('/index.html');
  // The hero waits on its image probes, so it settles after the card sections below it.
  await expect(page.locator('#hero-mosaic article')).toHaveCount(3);
  await expect(page.locator('#trending-cards article')).toHaveCount(3);
  await expect(page.locator('#new-listings-cards article')).toHaveCount(3);
  await expect(page.locator('#ending-soon-cards article')).toHaveCount(4);

  const state = await page.evaluate((placeholder) => {
    const all = [
      ...document.querySelectorAll<HTMLImageElement>(
        '#hero-mosaic img, #trending-cards img, #new-listings-cards img, #ending-soon-cards img'
      ),
    ];
    return {
      total: all.length,
      broken: all.filter((i) => i.complete && i.naturalWidth === 0).length,
      heroPlaceholders: [
        ...document.querySelectorAll<HTMLImageElement>('#hero-mosaic img'),
      ].filter((i) => i.getAttribute('src') === placeholder)
        .length,
      // A working photograph must not be swapped out:
      //  `complete` turns true before the dimensions are known, and reading that as failure replaced one card in ten with the placeholder.
      swappedButFine: all.filter(
        (i) =>
          i.getAttribute('src') === placeholder &&
          i.getAttribute('alt') !== '' &&
          i.naturalWidth > 1
      ).length,
    };
  }, PLACEHOLDER);

  expect(state.total).toBe(13);
  expect(state.broken).toBe(0);
  expect(state.heroPlaceholders).toBe(0);
  expect(state.swappedButFine).toBe(0);

  expect(mock.consoleErrors).toEqual([]);
});

test('a pool with two active lots renders a two-tile hero, not a hole', async ({
  page,
  mock,
}) => {
  // Reachable before this branch too, and mishandled:
  //  the secondary row was a two-column grid  whatever it held, so a single tile sat beside an empty track.
  await serveActivePool(page, (pool) => {
    pool.data = pool.data.slice(0, 2);
    pool.meta = { ...pool.meta, pageCount: 1, totalCount: 2 };
  });

  await page.goto('/index.html');
  await expect(page.locator('#hero-mosaic article')).toHaveCount(2);

  const grid = await page.evaluate(() => {
    const row = document.querySelector('#hero-mosaic > div.grid');
    const main = document.querySelector('#hero-mosaic > article');
    return {
      secondaryColumns: row
        ? getComputedStyle(row).gridTemplateColumns.split(' ').length
        : 0,
      mainSpansOneRow: main?.className.includes('row-span-1') ?? false,
    };
  });

  // One tile, one track: no empty cell beside it.
  expect(grid.secondaryColumns).toBe(1);
  expect(grid.mainSpansOneRow).toBe(true);

  expect(mock.consoleErrors).toEqual([]);
});

test('a pool with one active lot gives the whole mosaic to it', async ({
  page,
  mock,
}) => {
  await serveActivePool(page, (pool) => {
    pool.data = pool.data.slice(0, 1);
    pool.meta = { ...pool.meta, pageCount: 1, totalCount: 1 };
  });

  await page.goto('/index.html');
  await expect(page.locator('#hero-mosaic article')).toHaveCount(1);

  // Otherwise the article keeps row-span-1 and the mosaic's second row stays empty.
  await expect(page.locator('#hero-mosaic > article')).toHaveClass(
    /row-span-2/
  );

  expect(mock.consoleErrors).toEqual([]);
});
