import { readFileSync } from 'node:fs';
import { test, expect } from './support/fixtures';
import { IDS } from './support/mock';

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
    await page.locator('#toggle-advanced-filters').click();
    await page.waitForTimeout(300);
    expect(describe(await axeViolations(page)), 'home, menus open').toBe('');

    await page.goto(`/listing-edit.html?id=${IDS.own}`);
    await expect(page.locator('#edit-listing-content')).toBeVisible();
    await page.waitForTimeout(700);
    await page.locator('#deleteButton').click();
    await page.waitForTimeout(300);
    expect(describe(await axeViolations(page)), 'delete modal open').toBe('');
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
   * The sticky catalog bar hides by sliding above the viewport.
   * It is position:fixed, so a control left focusable there cannot be scrolled into view — you tab to nothing.
   */
  test('the hidden sticky filter bar holds no tab stops', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('#hero-mosaic')).toBeVisible();
    await page.waitForTimeout(800);

    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => {
        const bar = document.getElementById('sticky-catalog-filters');
        return !!bar?.contains(document.activeElement);
      });
      expect(inside, `Tab ${i + 1} landed in the hidden sticky bar`).toBe(
        false
      );
    }
  });

  test('the sticky filter bar is operable once it slides in', async ({
    page,
  }) => {
    await page.goto('/index.html');
    await expect(page.locator('#hero-mosaic')).toBeVisible();
    await page.waitForTimeout(800);
    // `scroll-behavior: smooth` makes scrollIntoView asynchronous, so wait on the bar itself
    // rather than a fixed delay. toBeVisible() fails on visibility:hidden, which is the gate.
    await page.evaluate(() =>
      document.getElementById('catalog-cards')?.scrollIntoView()
    );
    await expect(page.locator('#sticky-catalog-filters')).toBeVisible();

    await page.locator('#sticky-sort-select').focus();
    await expect(page.locator('#sticky-sort-select')).toBeFocused();
  });

  /** Two selects driving the same catalog must not announce identically. */
  test('the two sort selects have distinct accessible names', async ({
    page,
  }) => {
    await page.goto('/index.html');
    await expect(page.locator('#hero-mosaic')).toBeVisible();
    await page.waitForTimeout(800);

    const navbar = await page
      .locator('#sort-filter-select')
      .getAttribute('aria-label');
    const sticky = await page
      .locator('#sticky-sort-select')
      .getAttribute('aria-label');
    expect(navbar).toBeTruthy();
    expect(sticky).not.toBe(navbar);
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
