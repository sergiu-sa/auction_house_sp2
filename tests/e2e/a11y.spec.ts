import { readFileSync } from 'node:fs';
import { test, expect } from './support/fixtures';
import { IDS, loadFixture } from './support/mock';

/**
 * The accessibility tripwire.
 *
 * Phase 4 took axe from 49 violation nodes logged out and 59 logged in to zero, so zero is what this asserts.
 * A threshold of "no more than N" would let the count drift back up one node at a time;
 *   an exact zero fails on the first regression.
 *
 * The behavioural half matters more and axe cannot see any of it;
 *   focus entering a dialog, Escape closing it, a live region existing before it has something to say.
 * Those assertions are here because that is where the real defects were.
 */

const AXE = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

interface PageCase {
  name: string;
  url: string;
  ready: string;
}

const PUBLIC_PAGES: PageCase[] = [
  { name: 'home', url: '/index.html', ready: '#hero-mosaic' },
  {
    name: 'collection',
    url: '/collection.html',
    ready: '#collection-cards-grid',
  },
  {
    name: 'listing detail',
    url: `/listing.html?id=${IDS.otherSeller}`,
    ready: '#listing-details',
  },
  { name: 'login', url: '/login.html', ready: '#login-form' },
  { name: 'register', url: '/register.html', ready: '#register-form' },
];

const GATED_PAGES: PageCase[] = [
  { name: 'profile', url: '/profile.html', ready: '#profile-content' },
  {
    name: 'listing create',
    url: '/listing-create.html',
    ready: '#create-listing-content',
  },
  {
    name: 'listing edit',
    url: `/listing-edit.html?id=${IDS.own}`,
    ready: '#edit-listing-content',
  },
];

interface Violation {
  id: string;
  impact: string;
  nodes: number;
  targets: string[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function axeViolations(page: any): Promise<Violation[]> {
  await page.addScriptTag({ content: AXE });
  const results = await page.evaluate(async (tags: string[]) => {
    return await (window as any).axe.run(document, {
      resultTypes: ['violations'],
      runOnly: { type: 'tag', values: tags },
    });
  }, TAGS);

  return results.violations.map((v: any) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.length,
    targets: v.nodes.map((n: any) => n.target.join(' ')),
  }));
}

/** Readable failure: which rule, which element — not just a number. */
function describe(violations: Violation[]): string {
  return violations
    .map((v) => `${v.id} (${v.impact}) x${v.nodes}: ${v.targets.join(' | ')}`)
    .join('\n');
}

test.describe('axe — logged out', () => {
  for (const page_ of PUBLIC_PAGES) {
    test(`${page_.name} has no violations`, async ({ page }) => {
      await page.goto(page_.url);
      await expect(page.locator(page_.ready)).toBeVisible();
      await page.waitForTimeout(700);

      const violations = await axeViolations(page);
      expect(describe(violations), `${page_.name}, logged out`).toBe('');
    });
  }
});

/**
 * The profile's pager renders only for a seller with more lots than one page holds, and no recorded fixture produces one;
 *   so without this override axe never sees these controls at all.
 */
test.describe('axe — the profile pager', () => {
  test.use({ auth: 'in' });

  test('a profile with a second page has no violations', async ({ page }) => {
    await page.route(/\/auction\/profiles\/[^/]+\/listings/, (route) => {
      const template = loadFixture<{ data: Record<string, unknown>[] }>(
        'profile-listings'
      ).data[0];

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: Array.from({ length: 6 }, (_, i) => ({
            ...template,
            id: `pager-lot-${i}`,
          })),
          meta: { currentPage: 1, pageCount: 3, totalCount: 18 },
        }),
      });
    });

    await page.goto('/profile.html');
    // PREV, 1, 2, 3, NEXT — proves the controls exist before axe is asked about them.
    await expect(
      page.locator('#profile-listings-pagination button')
    ).toHaveCount(5);
    await page.waitForTimeout(700);

    const violations = await axeViolations(page);
    expect(describe(violations), 'profile with a pager').toBe('');
  });
});

test.describe('axe — logged in', () => {
  test.use({ auth: 'in' });

  for (const page_ of [...PUBLIC_PAGES.slice(0, 3), ...GATED_PAGES]) {
    test(`${page_.name} has no violations`, async ({ page }) => {
      await page.goto(page_.url);
      await expect(page.locator(page_.ready)).toBeVisible();
      await page.waitForTimeout(700);

      const violations = await axeViolations(page);
      expect(describe(violations), `${page_.name}, logged in`).toBe('');
    });
  }

  /** Both overlays hide their content by default, so a closed-page scan never reaches them. */
  test('open overlays have no violations', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('#hero-mosaic')).toBeVisible();
    await page.waitForTimeout(700);
    await page.locator('#profile-menu-btn').click();
    await page.waitForTimeout(300);
    expect(describe(await axeViolations(page)), 'home, menus open').toBe('');

    await page.goto(`/listing-edit.html?id=${IDS.own}`);
    await expect(page.locator('#edit-listing-content')).toBeVisible();
    await page.waitForTimeout(700);
    await page.locator('#deleteButton').click();
    await page.waitForTimeout(300);
    expect(describe(await axeViolations(page)), 'delete modal open').toBe('');
  });

  /**
   * Choosing a category collapses the panel, which is display:none below `lg` , so the button that was just activated stops rendering while it still holds focus, and the browser drops focus to <body>.
   * A keyboard reader picking a category was thrown back to the skip link.
   */
  test('choosing a category keeps focus in the bar', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/collection.html');

    await page.locator('#catalog-filters-toggle').click();
    await page.locator('[data-catalog-filter="tech"]').focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('#catalog-filters-toggle')).toBeFocused();
  });

  /**
   * Below `lg` the filter panel is display:none until the reader opens it, so the standing page scans only ever see it collapsed.
   * This is the one scan that reaches it open.
   */
  test('the expanded filter panel has no violations', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    for (const path of ['/index.html', '/collection.html']) {
      await page.goto(path);
      await page.locator('#catalog-filters-toggle').click();
      await expect(page.locator('#catalog-sort-select')).toBeVisible();
      expect(describe(await axeViolations(page)), `${path}, panel open`).toBe(
        ''
      );
    }
  });
});

test.describe('focus behaviour axe cannot see', () => {
  test.use({ auth: 'in' });

  test('the delete dialog takes focus, traps Tab, and Escape closes it', async ({
    page,
  }) => {
    await page.goto(`/listing-edit.html?id=${IDS.own}`);
    await expect(page.locator('#edit-listing-content')).toBeVisible();
    await page.waitForTimeout(700);

    await page.locator('#deleteButton').focus();
    await page.keyboard.press('Enter');

    // Cancel, not Delete Forever — the safe option is the one under your hands.
    await expect(page.locator('#cancelDelete')).toBeFocused();

    // Six tabs used to walk into the footer behind the overlay.
    for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
    expect(
      await page.evaluate(
        () => !!document.activeElement?.closest('#deleteModal')
      ),
      'Tab escaped the dialog'
    ).toBe(true);

    await page.keyboard.press('Escape');
    await expect(page.locator('#deleteModal')).toBeHidden();
    await expect(page.locator('#deleteButton')).toBeFocused();
  });

  test('Escape closes the profile menu and returns focus', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('#hero-mosaic')).toBeVisible();
    await page.waitForTimeout(700);

    await page.locator('#profile-menu-btn').click();
    await expect(page.locator('#profile-menu-btn')).toHaveAttribute(
      'aria-expanded',
      'true'
    );

    await page.keyboard.press('Escape');
    await expect(page.locator('#profile-dropdown-menu')).toBeHidden();
    await expect(page.locator('#profile-menu-btn')).toBeFocused();
  });

  test('the skip link moves focus, it does not only scroll', async ({
    page,
  }) => {
    await page.goto('/index.html');
    await expect(page.locator('#hero-mosaic')).toBeVisible();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // Without tabindex="-1" on the target this lands on <body> and announces nothing.
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('live regions exist before anything needs announcing', async ({
    page,
  }) => {
    await page.goto(`/listing.html?id=${IDS.otherSeller}`);
    await expect(page.locator('#listing-details')).toBeVisible();

    // A region inserted together with its message is the one mutation AT cannot observe.
    await expect(page.locator('#a11y-announcer-polite')).toHaveAttribute(
      'aria-live',
      'polite'
    );
    await expect(page.locator('#a11y-announcer-assertive')).toHaveAttribute(
      'aria-live',
      'assertive'
    );
    await expect(page.locator('#a11y-announcer-polite')).toBeEmpty();
  });

  test('a refused bid is announced assertively', async ({ page }) => {
    await page.goto(`/listing.html?id=${IDS.otherSeller}`);
    await expect(page.locator('#listing-details')).toBeVisible();

    await page.locator('#bid-amount').fill('1001');
    await page.locator('#place-bid-btn').click();

    await expect(page.locator('#a11y-announcer-assertive')).toHaveText(
      'Insufficient credits'
    );
  });
});

test.describe('overlays and off-screen controls', () => {
  test.use({ auth: 'in' });

  /**
   * The panel is display:none while collapsed, so its controls leave the tab order.
   * The bar it replaced slid above the viewport instead, where a focusable control could not be scrolled back into view,  you tabbed to nothing.
   */
  test('the collapsed filter panel holds no tab stops', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/collection.html');
    await expect(page.locator('#catalog-filter-bar')).toBeVisible();

    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => {
        const panel = document.getElementById('catalog-filters-panel');
        return !!panel?.contains(document.activeElement);
      });
      expect(inside, `Tab ${i + 1} landed in the collapsed panel`).toBe(false);
    }
  });

  test('the filter panel opens, is operable, and Escape returns focus', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/collection.html');

    const toggle = page.locator('#catalog-filters-toggle');
    await toggle.click();
    await expect(page.locator('#catalog-sort-select')).toBeVisible();

    await page.locator('#catalog-sort-select').focus();
    await expect(page.locator('#catalog-sort-select')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.locator('#catalog-sort-select')).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  /**
   * Escape closes the panel wherever the reader is, but must not take focus from them to do it.
   * The handler is on `document`, so an unconditional `focus()` pulled focus off whatever else Escape had just closed, the profile menu focuses its own trigger on the same keypress.
   */
  test('Escape from the search field closes the panel without taking focus', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/collection.html');

    await page.locator('#catalog-filters-toggle').click();
    await expect(page.locator('#catalog-sort-select')).toBeVisible();

    await page.locator('#catalog-search-input').focus();
    await page.keyboard.press('Escape');

    await expect(page.locator('#catalog-sort-select')).toBeHidden();
    await expect(page.locator('#catalog-search-input')).toBeFocused();
  });

  /**
   * There used to be two sort selects on Home:  the navbar's and the sticky bar's; and this asserted they announced differently.
   * There is now one, and this asserts that.
   */
  test('the catalog has exactly one sort select, and it is named', async ({
    page,
  }) => {
    await page.goto('/index.html');
    await expect(page.locator('#hero-mosaic')).toBeVisible();

    // `sort-filter-select` was the navbar's, and is gone; matching only what exists keeps this from looking wider than it is.
    const selects = page.locator('select[id$="sort-select"]');
    await expect(selects).toHaveCount(1);
    await expect(page.locator('#catalog-sort-select')).toHaveAttribute(
      'aria-label',
      /.+/
    );
  });

  /**
   * The dialog stays open showing "Deleting…" until the redirect, so the trap has to stay with it.
   * Releasing early puts focus on the trigger behind the overlay.
   */
  test('a successful delete keeps focus inside the open dialog', async ({
    page,
  }) => {
    await page.route('**/auction/listings/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        return route.fulfill({ status: 204, body: '' });
      }
      return route.fallback();
    });

    await page.goto(`/listing-edit.html?id=${IDS.own}`);
    await expect(page.locator('#edit-listing-content')).toBeVisible();
    await page.waitForTimeout(800);

    await page.locator('#deleteButton').click();
    await page.locator('#confirmDelete').click();
    await page.waitForTimeout(400);

    for (let i = 0; i < 4; i++) await page.keyboard.press('Tab');
    expect(
      await page.evaluate(
        () => !!document.activeElement?.closest('#deleteModal')
      ),
      'Tab escaped the dialog while the delete was in flight'
    ).toBe(true);
  });
});

/** Logged out on purpose: an authenticated visitor is bounced off the login page. */
test.describe('form errors', () => {
  test('an invalid field points at the message that explains it', async ({
    page,
  }) => {
    await page.goto('/login.html');
    await expect(page.locator('#login-form')).toBeVisible();
    await page.locator('#login-form button[type="submit"]').click();

    const email = page.locator('#email');
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    // aria-invalid alone only says "something is wrong", never what.
    await expect(email).toHaveAttribute('aria-describedby', 'email-error');
    await expect(page.locator('#email-error')).toHaveAttribute('role', 'alert');
    await expect(page.locator('#email-error')).toHaveText('Email is required');
  });

  /** aria-describedby is a list: an error must not evict a description already there. */
  test('an error does not destroy a description the field already had', async ({
    page,
  }) => {
    await page.goto('/login.html');
    await expect(page.locator('#login-form')).toBeVisible();
    await page.evaluate(() =>
      document
        .getElementById('email')!
        .setAttribute('aria-describedby', 'permanent-hint')
    );

    await page.locator('#login-form button[type="submit"]').click();
    await expect(page.locator('#email')).toHaveAttribute(
      'aria-describedby',
      'permanent-hint email-error'
    );

    await page.locator('#email').fill('someone@stud.noroff.no');
    await expect(page.locator('#email')).toHaveAttribute(
      'aria-describedby',
      'permanent-hint'
    );
  });
});

/**
 * The gallery's overflow control, before and after it is pressed.
 *
 * The sweep above visits `listing.html` only at `IDS.otherSeller`, which has four photographs;
 * one short of the control rendering at all.
 * So neither the button nor the revealed-thumbnail state had ever been swept, which is the fixture-width trap.
 *
 */
test('axe — the lot gallery with more photographs than it shows', async ({
  page,
}) => {
  await page.goto(`/listing.html?id=${IDS.manyMedia}`);
  await expect(page.locator('#media-gallery')).toBeVisible();

  const control = page.locator('[data-show-all-thumbnails]');
  await expect(control).toBeVisible();

  const collapsed = await axeViolations(page);
  expect(collapsed, describe(collapsed)).toEqual([]);

  await control.click();
  // The revealed thumbnails are the state no fixture used to produce.
  await expect(page.locator('.thumbnail-btn').nth(6)).toBeVisible();

  const expanded = await axeViolations(page);
  expect(expanded, describe(expanded)).toEqual([]);
});

/**
 * The visitor's profile hero, which is a different shape from the owner's.
 *
 * The sweep above visits `/profile.html` with no `?user=`, so it only ever sees the owner's four-tile row.
 * Guarding the credits tile made a three-tile branch that nothing was checking.
 */
test.describe('axe — a profile that is not mine', () => {
  test.use({ auth: 'in' });

  test('the three-tile visitor hero has no violations', async ({ page }) => {
    await page.goto('/profile.html?user=Seller13');
    await expect(page.locator('#profile-content')).toContainText('This seller');

    const violations = await axeViolations(page);
    expect(violations, describe(violations)).toEqual([]);
  });
});
