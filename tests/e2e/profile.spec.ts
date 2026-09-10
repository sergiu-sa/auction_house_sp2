import { test, expect } from './support/fixtures';
import { loadFixture } from './support/mock';

/**
 * A seller with more lots than one page holds.
 *
 * The recorded fixture has three lots on a single page, so nothing committed renders the pager at all;
 *   the second page has to be built here or the branch ships untested.
 * Every lot in that fixture also ended before the frozen clock, which is what makes the "Ended" assertion real.
 */

interface ListingsFixture {
  data: { id: string; title: string; endsAt: string }[];
  meta: Record<string, unknown>;
}

const PAGE_SIZE = 6;
const TOTAL = 12;

// Every recorded profile lot ended before the frozen clock, so without this one running lot nothing in the suite renders a live card or its "Ends ..." line.
const STILL_RUNNING = '2026-09-30T12:00:00.000Z';

function sellerPage(pageNumber: number): ListingsFixture {
  const template = loadFixture<ListingsFixture>('profile-listings').data[0];

  return {
    data: Array.from({ length: PAGE_SIZE }, (_, i) => ({
      ...template,
      id: `page-${pageNumber}-lot-${i}`,
      title: `Page ${pageNumber} lot ${i + 1}`,
      endsAt: i === 0 ? STILL_RUNNING : template.endsAt,
    })),
    meta: { currentPage: pageNumber, pageCount: 2, totalCount: TOTAL },
  };
}

test('a seller with two pages of lots can reach the second', async ({
  page,
}) => {
  const pagesRequested: string[] = [];

  await page.route(/\/auction\/profiles\/[^/]+\/listings/, (route) => {
    const requested = new URL(route.request().url()).searchParams.get('page');
    pagesRequested.push(requested ?? '');

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(sellerPage(Number(requested ?? 1))),
    });
  });

  await page.goto('/profile.html?user=Seller13');

  const panel = page.locator('#profile-listings');
  await expect(panel).toContainText(`Showing 1-6 of ${TOTAL} listings`);
  await expect(panel.locator('article')).toHaveCount(PAGE_SIZE);

  // The count tile used to say "Active listings" over a total that included ended lots.
  await expect(page.locator('#profile-content')).not.toContainText(
    'Active listings'
  );
  await expect(panel).not.toContainText('Ends Ended');

  // Both branches of the card, in one render: one running lot, five closed ones.
  const cards = panel.locator('article');
  await expect(cards.first()).toContainText('Ends');
  await expect(panel.getByText('ENDED', { exact: true })).toHaveCount(
    PAGE_SIZE - 1
  );
  await expect(panel.getByText('Ended', { exact: true })).toHaveCount(
    PAGE_SIZE - 1
  );

  await panel.getByRole('button', { name: 'Go to page 2' }).click();

  await expect(panel).toContainText(`Showing 7-12 of ${TOTAL} listings`);
  await expect(
    panel.getByRole('heading', { name: 'Page 2 lot 1' })
  ).toBeVisible();
  expect(pagesRequested).toEqual(['1', '2']);
});

/**
 * Whose profile the copy thinks it is describing.
 *
 * Every section of this page is written twice — once for the owner, once for a visitor — except
 * the wins and bids panels, which took no `isOwnProfile` at all. A stranger's profile therefore
 * read "You have won 2 auctions" and "You have placed 18 bids" about somebody else, under a
 * heading that correctly said "Seller13's Profile".
 *
 * Nothing else could catch it: the markup is valid, axe is clean, and the fixture answers every
 * profile route as the same user, so the *numbers* look right either way. Only the pronoun is
 * wrong.
 */
test.describe('logged in', () => {
  test.use({ auth: 'in' });

  test("another seller's profile does not address the visitor as its owner", async ({
    page,
  }) => {
    await page.goto('/profile.html?user=Seller13');

    const content = page.locator('#profile-content');
    await expect(page.locator('#page-title')).toHaveText("Seller13's Profile");

    await expect(content).toContainText('This seller has won');
    await expect(content).toContainText('This seller has placed');
    await expect(content).not.toContainText('You have won');
    await expect(content).not.toContainText('You have placed');
    await expect(content).not.toContainText('Your won items');
    await expect(content).not.toContainText('Your bids will appear');
  });

  test('my own profile still speaks to me', async ({ page }) => {
    await page.goto('/profile.html');

    const content = page.locator('#profile-content');
    await expect(content).toContainText('You have won');
    await expect(content).toContainText('You have placed');
    await expect(content).not.toContainText('This seller has');
  });
});
