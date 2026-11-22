import { defineConfig, devices } from '@playwright/test';

import { E2E_BASE_URL } from './support/e2e-stack.js';

// The E2E tests run in a real browser against the whole system from docker compose
// (docker-compose.e2e.yml). Run them from the repo root with "npm run test:e2e".
export default defineConfig({
  testDir: './tests',
  // Starts the E2E system before the tests and stops it afterwards.
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  fullyParallel: true,
  // A test.only left in the code fails the CI run instead of skipping every other test.
  forbidOnly: Boolean(process.env.CI),
  // No retries: a flaky test is a bug (docs/engineering-standards.md §10.2), so it must fail.
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: E2E_BASE_URL,
    // A trace and a screenshot of every failed test go into the HTML report (§10.3).
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
