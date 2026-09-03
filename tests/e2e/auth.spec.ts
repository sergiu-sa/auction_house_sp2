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
    // Local wall-clock time, not the fixture's UTC. endsAt is 14:43Z and the suite runs in Europe/Oslo, so 15:43 in February. It read 14:43 while the form formatted with toISOString(), which is the bug this pins.
    await expect(page.locator('#endDate')).toHaveValue('2026-02-21T15:43');
    expect(mock.consoleErrors).toEqual([]);
  });

  test('the end date is shown but cannot be edited', async ({ page }) => {
    await page.goto(`/listing-edit.html?id=${IDS.own}`);

    const endDate = page.locator('#endDate');
    await expect(endDate).toHaveAttribute('readonly', '');
    // The reason has to reach a screen reader, not just sighted users: the field went from
    // editable-and-required to read-only, so "read only" alone drops the explanation.
    await expect(endDate).toHaveAttribute('aria-describedby', 'endDateHint');
    await expect(page.locator('#endDateHint')).toContainText(
      'cannot be changed'
    );
  });

  /**
   * The only outgoing request shape this suite asserts. PUT /auction/listings/<id> was
   * previously untouched by any test, which is how the form came to collect an end date it
   * discarded and to keep tags the user had cleared.
   */
  test('saving the edit form sends what the form shows', async ({ page }) => {
    let putBody: Record<string, unknown> | null = null;

    // Registered after the fixture's routes, and later registrations win.
    await page.route('**/auction/listings/*', async (route, request) => {
      if (request.method() !== 'PUT') return route.fallback();
      putBody = request.postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: IDS.own }, meta: {} }),
      });
    });

    await page.goto(`/listing-edit.html?id=${IDS.own}`);
    await expect(page.locator('#tags')).toHaveValue(
      'watch, luxury, heritage, tech'
    );

    await page.locator('#tags').fill('');
    await page.locator('#editForm button[type="submit"]').click();

    await expect.poll(() => putBody).not.toBeNull();
    const body = putBody as unknown as Record<string, unknown>;

    // Cleared means cleared. Omitting the key left the old tags on the listing.
    expect(body.tags).toEqual([]);

    // The API has no endsAt on this endpoint, so the form must not pretend to send one.
    expect(Object.keys(body)).not.toContain('endsAt');

    // The media round trip survives being serialised into a textarea and parsed back.
    expect((body.media as Array<{ url: string }>).map((m) => m.url)).toHaveLength(3);
    expect(body.title).toBe('Arceau watch, Large model, 36 mm');
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
