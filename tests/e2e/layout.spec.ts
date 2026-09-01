import type { Page } from '@playwright/test';
import { test, expect } from './support/fixtures';
import { IDS, loadFixture } from './support/mock';

/**
 * Horizontal page overflow, in the states the visual baselines cannot photograph.
 *
 * Every bug guarded here is the same one:
 *  a flex item keeps `min-width: auto`, so its automatic minimum size is the min-content width of its text.
 * `break-words` does not lower that;
 *   it only breaks the word once a width has been imposed, so one long unbroken title or username widens the column past its container and scrolls the whole page sideways.
 * Grid view escapes it because Tailwind's tracks are `minmax(0, 1fr)`, which suppresses the automatic minimum;
 *  flex has no equivalent, which is why these assertions are all in flex.
 */

/** 108 characters, one word. Recorded from a real listing, not invented. */
const LONG_WORD =
  'Testtesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttest';

async function pageWidths(
  page: Page
): Promise<{ scrollWidth: number; clientWidth: number }> {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
}

/** Serve one mutated fixture for a single path, over the top of the standing mocks. */
async function overrideJson(
  page: Page,
  path: RegExp,
  body: unknown
): Promise<void> {
  await page.route(path, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  );
}

/**
 * Hold the next catalog response open and measure the skeleton frame it paints.
 * The handler is never awaited by the test, so the delay costs the suite nothing.
 */
async function skeletonFrame(page: Page): Promise<{
  tag: string;
  height: number;
}> {
  await page.route('**/auction/listings?*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.fallback();
  });
  await page.locator('#refresh-listings-btn').click();

  return page.evaluate(() => {
    const first = document.getElementById(
      'collection-cards-grid'
    )?.firstElementChild;
    return {
      tag: first?.tagName ?? '',
      height: Math.round(first?.getBoundingClientRect().height ?? 0),
    };
  });
}

test.describe('list view', () => {
  test.use({ viewport: { width: 768, height: 812 } });

  /**
   * The catalog's first page carries a 108-character single-word title.
   * In list view its content column measured 978px inside a 704px card and took the document
   * to scrollWidth 1269 against a 768px viewport.
   */
  test('a long title cannot widen the list card past its container', async ({
    page,
  }) => {
    await page.goto('/collection.html');
    const grid = page.locator('#collection-cards-grid');
    await expect(grid.locator('article')).toHaveCount(24);

    await page.locator('#list-view-btn').click();
    await expect(grid).not.toHaveClass(/sm:grid-cols-2/);

    const metrics = await page.evaluate(() => {
      const card = [
        ...document.querySelectorAll('#collection-cards-grid article'),
      ].find((a) => a.textContent?.includes('Testtesttest'));
      const body = card?.querySelector('div.flex-1');
      return {
        cardWidth: Math.round(card?.getBoundingClientRect().width ?? 0),
        bodyWidth: Math.round(body?.getBoundingClientRect().width ?? 0),
      };
    });

    expect(metrics.cardWidth).toBeGreaterThan(0);
    expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.cardWidth);

    const { scrollWidth, clientWidth } = await pageWidths(page);
    expect(scrollWidth).toBe(clientWidth);
  });

  /**
   * Skeletons are grid-shaped markup;
   *  in a single-column list container their square media box resolved to 1210x1210 and the document grew from 9,487px to 37,775px on every refetch.
   */
  test('loading skeletons follow the view mode', async ({ page }) => {
    await page.goto('/collection.html');
    await expect(page.locator('#collection-cards-grid article')).toHaveCount(
      24
    );
    await page.locator('#list-view-btn').click();

    const skeleton = await skeletonFrame(page);

    expect(skeleton.tag).toBe('DIV');
    // The list card is 265px tall at this width; the grid skeleton was 932px.
    expect(skeleton.height).toBeLessThan(400);
  });
});

test.describe('long user content', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  /**
   * Every string the seller controls, not just the title: fixing the <h1> alone left the description, the tag chips, the seller's name and their bio each able to do it again.
   */
  test('hostile listing text cannot scroll the detail page sideways', async ({
    page,
  }) => {
    const listing = loadFixture<{
      data: {
        title: string;
        description: string;
        tags: string[];
        seller?: { name: string; bio: string };
      };
    }>('listing-single');
    listing.data.title = LONG_WORD;
    listing.data.description = LONG_WORD;
    listing.data.tags = [LONG_WORD];
    if (listing.data.seller) {
      listing.data.seller.name = LONG_WORD;
      listing.data.seller.bio = LONG_WORD;
    }

    // The app appends ?_seller=true&_bids=true, so match the path and let the query vary.
    await overrideJson(
      page,
      new RegExp(`/auction/listings/${IDS.otherSeller}(\\?|$)`),
      listing
    );

    await page.goto(`/listing.html?id=${IDS.otherSeller}`);
    await expect(page.locator('#listing-header h1')).toContainText(
      'Testtesttest'
    );

    const { scrollWidth, clientWidth } = await pageWidths(page);
    expect(scrollWidth).toBe(clientWidth);
  });
});

test.describe('long profile identity', () => {
  test.use({ auth: 'in', viewport: { width: 320, height: 812 } });

  /**
   * `isValidUsername` bounds the character set and a minimum length, never a maximum, and the hero also renders the full @stud.noroff.no address and the bio. 22 characters overflowed at 320px.
   */
  test('a long username, email and bio cannot scroll the profile sideways', async ({
    page,
  }) => {
    const profile = loadFixture<{
      data: { name: string; email: string; bio: string };
    }>('profile');
    profile.data.name = LONG_WORD;
    profile.data.email = `${LONG_WORD}@stud.noroff.no`;
    profile.data.bio = LONG_WORD;

    // The navbar fetches the profile too and rewrites the stored user from it, so the page then asks for the *new* name.
    // Match any bare profile path, not one username.
    await overrideJson(page, /\/auction\/profiles\/[^/?]+(\?|$)/, profile);

    await page.goto('/profile.html');
    await expect(page.locator('#profile-content h2').first()).toContainText(
      'Testtesttest'
    );

    const { scrollWidth, clientWidth } = await pageWidths(page);
    expect(scrollWidth).toBe(clientWidth);
  });
});

test.describe('320px', () => {
  test.use({ viewport: { width: 320, height: 812 } });

  /**
   * Both pages' eyebrow row is a flex row with no wrap, so its min-content is the sum of its two groups:
   *  227.84px plus 54px of padding and border against 218px of space.
   * login overflowed by 13px, register by 9px.
   */
  for (const path of ['/login.html', '/register.html']) {
    test(`${path} fits the narrowest supported viewport`, async ({ page }) => {
      await page.goto(path);
      // networkidle is a fixed 500ms sleep.
      // The footer is empty in the HTML and filled by renderFooter(), so it proves the chrome that moves this layout is in place.
      await expect(page.locator('#footer a').first()).toBeVisible();

      const { scrollWidth, clientWidth } = await pageWidths(page);
      expect(scrollWidth).toBe(clientWidth);
    });
  }
});

test.describe('owner-facing pages', () => {
  test.use({ auth: 'in', viewport: { width: 375, height: 812 } });

  /**
   * The edit form echoes the listing into a live preview card.
   * `#previewTitle` took the page to 835px, and the breadcrumb beside it collapsed its linked crumbs to 11px and 16px while their text kept its full width, painting "Home" and "Profile" over the separators.
   */
  test('a hostile title cannot scroll or scramble the edit page', async ({
    page,
  }) => {
    const listing = loadFixture<{
      data: { title: string; description: string };
    }>('listing-own');
    listing.data.title = LONG_WORD;
    listing.data.description = LONG_WORD;

    // The seller is left alone so requireOwnership() still lets the page render.
    await overrideJson(
      page,
      new RegExp(`/auction/listings/${IDS.own}(\\?|$)`),
      listing
    );

    await page.goto(`/listing-edit.html?id=${IDS.own}`);
    await expect(page.locator('#previewTitle')).toContainText('Testtesttest');

    const { scrollWidth, clientWidth } = await pageWidths(page);
    expect(scrollWidth).toBe(clientWidth);

    // A crumb narrower than the text inside it is a crumb printed over its neighbour.
    const crumbs = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          'nav[aria-label="Breadcrumb"] li:has(> a), nav[aria-label="Breadcrumb"] li:has(> span)'
        ),
      ].map((li) => ({
        text: (li.textContent ?? '').trim().slice(0, 12),
        box: Math.round(li.getBoundingClientRect().width),
        content: Math.round(
          li.firstElementChild?.getBoundingClientRect().width ?? 0
        ),
      }))
    );
    expect(crumbs.length).toBeGreaterThan(0);
    for (const crumb of crumbs) {
      expect(
        crumb.content,
        `breadcrumb "${crumb.text}" renders ${crumb.content}px inside a ${crumb.box}px box`
      ).toBeLessThanOrEqual(crumb.box + 1);
    }
  });
});

test.describe('list skeleton below the sm breakpoint', () => {
  test.use({ viewport: { width: 900, height: 812 } });

  /**
   * The view toggle is hidden below 640px, but a viewport that narrows after the switch keeps list mode.
   * There the real card's media is `aspect-square` while the skeleton's was 3/2, so the card grew 142px per row when the data landed.
   */
  test('the skeleton matches the card it is standing in for', async ({
    page,
  }) => {
    await page.goto('/collection.html');
    await expect(page.locator('#collection-cards-grid article')).toHaveCount(
      24
    );
    await page.locator('#list-view-btn').click();
    await page.setViewportSize({ width: 375, height: 812 });

    const cardHeight = await page.evaluate(
      () =>
        document
          .querySelector('#collection-cards-grid article')!
          .getBoundingClientRect().height
    );

    const skeleton = await skeletonFrame(page);

    expect(Math.abs(skeleton.height - cardHeight)).toBeLessThan(60);
  });
});
