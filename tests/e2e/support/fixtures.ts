import { test as base, expect } from '@playwright/test';
import {
  FROZEN_AT,
  installMocks,
  type ListingsMode,
  type MockController,
} from './mock';

/** The profile fixture's owner; every profile route answers as this user. */
export const OWNER = 'Oltenks';

export interface TestOptions {
  /** 'in' seeds localStorage; the login form is never driven (needs a password). */
  auth: 'in' | 'out';
  listings: ListingsMode;
}

export const test = base.extend<TestOptions & { mock: MockController }>({
  auth: ['out', { option: true }],
  listings: ['default', { option: true }],

  mock: [
    async ({ page, context, auth, listings }, use) => {
      // setFixedTime, not clock.install():
      //  timers keep running, so Home's 300ms/400ms deferred renders still fire.
      await page.clock.setFixedTime(FROZEN_AT);

      if (auth === 'in') {
        await context.addInitScript(
          ([owner, at]) => {
            localStorage.setItem('token', 'e2e-token-not-a-real-jwt');
            localStorage.setItem('tokenTimestamp', String(at));
            localStorage.setItem(
              'user',
              JSON.stringify({
                name: owner,
                email: 'redacted@stud.noroff.no',
                credits: 968,
                avatar: {
                  url: 'https://images.pexels.com/photos/10160029/x.jpeg',
                  alt: 'avatar',
                },
              })
            );
          },
          [OWNER, FROZEN_AT.getTime()] as const
        );
      }

      const controller = await installMocks(page, { listings });
      await use(controller);

      // If the app reached for anything unclaimed, the mocking is incomplete.
      expect(
        controller.unexpected,
        'unmocked external requests — the suite would behave differently offline'
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
