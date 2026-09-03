/// <reference types="node" />
// Root tsconfig sets types: ["vite/client"]; this file runs in Node.
import { defineConfig, devices } from '@playwright/test';
import type { TestOptions } from './tests/e2e/support/fixtures';

const PORT = 4173;
const baseURL = `http://localhost:${PORT}`;

/**
 * smoke  — the tripwire; every request served from tests/e2e/fixtures. Runs in CI.
 * visual — screenshot baselines. Local only: Playwright keys snapshots by
 *          platform, so darwin baselines never match an ubuntu runner.
 */
export default defineConfig<TestOptions>({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // A test that only passes on the second go is a flake; fix it, don't retry it.
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['github']] : [['list']],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',

    /*
     * The frozen clock (FROZEN_AT) fixes *when* the pages think it is; this fixes *where*.
     * Without it every render that formats an absolute local time, the edit form's datetime-local value, formatDate's output;
     *   depends on the machine's zone, so the same assertion passes locally and fails on a UTC runner.
     * Europe/Oslo because that is the zone the baselines were captured in;
     *  the point is that it is now stated rather than inherited.
     */
    timezoneId: 'Europe/Oslo',

    // E2E_OFFLINE=1 blackholes every host but localhost.
    // Routing happens before DNS, so a green run under it proves the mocking is complete.
    launchOptions: process.env.E2E_OFFLINE
      ? { args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost'] }
      : {},
  },

  projects: [
    {
      name: 'smoke',
      testIgnore: '**/visual.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'visual',
      testMatch: '**/visual.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  expect: {
    toHaveScreenshot: {
      /*
       * Zero tolerance, all three, because the previous settings twice reported green over a real
       * change: ~17,000 px a page of Phase 4 contrast work (F-084), and every sized icon rendering
       * 6 px short across 106 elements on the home page.
       *
       * `maxDiffPixelRatio` alone is not zero tolerance and that is what made both invisible —
       * `threshold` is a separate per-pixel colour tolerance defaulting to 0.2, so a colour could
       * change on every pixel of a region and still count as matching.
       *
       * Safe to be this strict here in a way it would not be in CI: the renders are deterministic
       * (mocked fixtures, a frozen clock, animations off), and this project is excluded from CI
       * because Playwright keys snapshots by platform. Measured across two builds and a toolchain
       * bump that moved esbuild three minors: 14/14 exact, a dozen runs, no false positive.
       *
       * When it does legitimately fail — a macOS font rasterisation change is the likely cause —
       * every baseline fails at once. Regenerate deliberately with
       * `npm run test:e2e:visual:update` and say so in the PR; do not loosen these back.
       */
      maxDiffPixelRatio: 0,
      maxDiffPixels: 0,
      threshold: 0,
      animations: 'disabled',
      caret: 'hide',
    },
  },

  // Built output, not the dev server. reuseExistingServer is off on purpose:
  // reusing a server skips the rebuild and tests a stale bundle.
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
