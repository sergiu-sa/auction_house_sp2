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
