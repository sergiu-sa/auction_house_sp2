import { test, expect } from './support/fixtures';
import { IDS } from './support/mock';

test('logged out, the navbar offers log in and create account', async ({
  page,
}) => {
  await page.goto('/index.html');
  const header = page.locator('#header');
  await expect(header).toContainText('Log in');
  await expect(header).toContainText('Create account');
  // 'Credits', not 'CREDITS':
  //  the navbar uppercases in CSS and toContainText reads textContent, so the uppercase form would never match, in either state.
  await expect(header).not.toContainText('Credits');
});

test.describe('logged in', () => {
  test.use({ auth: 'in' });

  test('the navbar shows the username and credit balance', async ({
    page,
    mock,
  }) => {
    await page.goto('/index.html');
    const header = page.locator('#header');
    await expect(header).toContainText('Oltenks');
    await expect(header).toContainText('Credits');
    await expect(header).toContainText('968');
    await expect(header).not.toContainText('Create account');
    expect(mock.consoleErrors).toEqual([]);
  });

  test('the edit form is populated from the fetched listing', async ({
    page,
    mock,
  }) => {
    await page.goto(`/listing-edit.html?id=${IDS.own}`);

    await expect(page.locator('#title')).toHaveValue(
      'Arceau watch, Large model, 36 mm'
    );
    await expect(page.locator('#description')).toHaveValue(
      /Steel watch, quartz movement/
    );
    await expect(page.locator('#endDate')).toHaveValue('2026-02-21T14:43');
    expect(mock.consoleErrors).toEqual([]);
  });

  test('a bid within the credit balance is submitted and confirmed', async ({
    page,
    mock,
  }) => {
    await page.goto(`/listing.html?id=${IDS.lowBid}`);

    await expect(page.locator('#bid-amount')).toHaveAttribute('min', '101');
    await page.locator('#bid-amount').fill('150');
    await page.locator('#place-bid-btn').click();

    // Scoped to the toast: the same text is also written to the page's live region.
    await expect(
      page.locator('#toast-container').getByText('Bid placed successfully!')
    ).toBeVisible();
    expect(mock.apiWrites).toContain(
      `POST /auction/listings/${IDS.lowBid}/bids`
    );
    expect(mock.consoleErrors).toEqual([]);
  });

  test('a bid above the credit balance never reaches the API', async ({
    page,
    mock,
  }) => {
    // Highest bid is 1000, so the minimum is 1001, above the fixture's 968 credits.
    // ListingDetail.ts:469 must stop this before placeBid is called.
    await page.goto(`/listing.html?id=${IDS.otherSeller}`);

    await page.locator('#bid-amount').fill('1001');
    await page.locator('#place-bid-btn').click();

    // Scoped to the toast: the same text is also written to the page's live region.
    await expect(
      page.locator('#toast-container').getByText('Insufficient credits')
    ).toBeVisible();
    expect(mock.apiWrites).toEqual([]);
  });
});
