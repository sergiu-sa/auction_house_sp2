import { test, expect } from './support/fixtures';
import { IDS } from './support/mock';

test('listing detail renders every region of the page', async ({
  page,
  mock,
}) => {
  await page.goto(`/listing.html?id=${IDS.otherSeller}`);

  await expect(page.locator('#listing-header')).toContainText(
    'Woven Handbag with Leather Flap Closure'
  );
  await expect(page.locator('#listing-header')).toContainText(
    'Stylish woven handbag'
  );
  await expect(page.locator('#media-gallery img').first()).toBeVisible();
  await expect(page.locator('#seller-profile')).toContainText('@Seller13');
  await expect(page.locator('#bid-history')).toContainText('1,000');
  // Constant because the clock is frozen.
  await expect(page.locator('#countdown-display')).toHaveText('6d 17h 43m');

  expect(mock.consoleErrors).toEqual([]);
});

test('logged out, the bid panel offers login instead of a bid form', async ({
  page,
}) => {
  await page.goto(`/listing.html?id=${IDS.otherSeller}`);

  await expect(page.locator('#bid-panel')).toContainText('Login to Bid');
  await expect(page.locator('#bid-form')).toHaveCount(0);

  const href = await page.locator('#bid-panel a').first().getAttribute('href');
  expect(href).toContain('redirect=');
  expect(href).toContain('listing.html');
});

test('an unknown id renders the error state, not a blank page', async ({
  page,
  mock,
}) => {
  await page.goto(`/listing.html?id=${IDS.missing}`);

  await expect(page.locator('#main-content')).toContainText(
    /failed to load listing/i
  );
  await expect(page.locator('#main-content')).toContainText(
    /back to listings/i
  );

  // The one page where a console error is expected:
  //  the 404 is caught and logged through utils/logger before the error state renders.
  expect(mock.consoleErrors.join('\n')).toContain('No listing with such ID');
});

/**
 * Where a seller link points for someone who is not signed in.
 *
 * Every `/auction/profiles/*` route is 401 without a token, so a guest following one used to get a spinner, a 401 and a "session expired" toast they had never earned.
 * The links go to login now.
 *
 * Asserted here rather than on the profile page itself, because nothing there can show it:
 *  the mock answers every profile route regardless of the Authorization header, so a profile spec stays green whether the fix is present or reverted.
 */
test('a guest is sent to log in before a seller profile, not into a 401', async ({
  page,
}) => {
  await page.goto(`/listing.html?id=${IDS.otherSeller}`);

  const links = page.locator('#seller-profile a');
  await expect(links).toHaveCount(2);

  for (let i = 0; i < 2; i++) {
    const href = await links.nth(i).getAttribute('href');
    expect(href, 'seller link for a guest').toMatch(
      /^\/login\.html\?redirect=/
    );
    // The return url has to survive its own query string, or the reader lands on the home page.
    const redirect = new URL(href!, 'https://x.invalid').searchParams.get(
      'redirect'
    );
    expect(redirect).toMatch(/^\/profile\.html\?user=/);
  }
});
