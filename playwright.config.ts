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
      // Absorbs font rasterisation jitter; anything larger is a real change.
      maxDiffPixelRatio: 0.01,
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
