import { test, expect } from './support/fixtures';
import { IDS } from './support/mock';

/**
 * The diff-able visual baseline:
 *  frozen clock plus mocked fixtures, so the rendered content is deterministic and a diff means something.
 *
 * Regenerate deliberately:
 *   npm run test:e2e:visual:update
 */

const VIEWPORTS = [
  { name: '375', width: 375, height: 812 },
  { name: '1440', width: 1440, height: 900 },
];

/** #active-users is Math.random() on an interval; nothing else is masked. */
const MASKS = { register: ['#active-users'] };

/**
 * networkidle and fonts.ready are not enough:
 *  Home defers sections behind setTimeouts and the footer counts numbers up.
 * Sample the text until it settles.
 */
/**
 * Cards use loading="lazy". A fullPage screenshot starts those loads but does not wait, so
 * below-the-fold cards captured blank or decoded at random.
 */
async function awaitImages(
  page: import('@playwright/test').Page
): Promise<void> {
  await page.evaluate(async () => {
    const images = [...document.querySelectorAll('img')];
    images.forEach((img) => {
      img.loading = 'eager';
    });
    await Promise.all(
      images.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener('load', () => resolve(), { once: true });
              img.addEventListener('error', () => resolve(), { once: true });
            })
      )
    );
  });
}

async function settle(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);

  await awaitImages(page);

  // null seed and a non-empty requirement:
  //  an empty first sample would look "stable" and get photographed blank.
  let previous: string | null = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const current = await page.evaluate(() => document.body.innerText);
    if (current.length > 0 && current === previous) {
      // ProductShowcase swaps each tile's img.src while the text is still settling, so the wait above finished before those loads even started.
      // Whether they landed decided whether the tile showed the real image or its onerror placeholder;
      //  the login and register baselines were recorded on opposite sides of that race.
      await awaitImages(page);
      return;
    }
    previous = current;
    await page.waitForTimeout(250);
  }
  throw new Error(
    'Page never stopped changing after 5s — refusing to screenshot it.'
  );
}

const PUBLIC = [
  { name: 'home', url: '/index.html' },
  { name: 'collection', url: '/collection.html' },
  { name: 'listing', url: `/listing.html?id=${IDS.otherSeller}` },
  { name: 'login', url: '/login.html' },
  { name: 'register', url: '/register.html' },
];

for (const viewport of VIEWPORTS) {
  test.describe(`logged out @ ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const target of PUBLIC) {
      test(target.name, async ({ page }) => {
        await page.goto(target.url);
        await settle(page);
        await expect(page).toHaveScreenshot(
          `${target.name}-${viewport.name}.png`,
          {
            fullPage: true,
            mask: (MASKS[target.name as keyof typeof MASKS] ?? []).map((s) =>
              page.locator(s)
            ),
          }
        );
      });
    }
  });
}

test.describe('logged in @ 1440', () => {
  test.use({ auth: 'in', viewport: { width: 1440, height: 900 } });

  const GATED = [
    { name: 'home-authed', url: '/index.html' },
    { name: 'profile', url: '/profile.html' },
    { name: 'listing-create', url: '/listing-create.html' },
    { name: 'listing-edit', url: `/listing-edit.html?id=${IDS.own}` },
  ];

  for (const target of GATED) {
    test(target.name, async ({ page }) => {
      await page.goto(target.url);
      await settle(page);
      await expect(page).toHaveScreenshot(`${target.name}-1440.png`, {
        fullPage: true,
      });
    });
  }
});
