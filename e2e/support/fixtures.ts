import { test as base } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';

import { loginThroughApi, SEED_PASSWORD, SEED_USERS } from './auth-api.js';
import type { SeedRole, StorageState } from './auth-api.js';
import { E2E_BASE_URL } from './e2e-stack.js';

/*
 * Logged-in pages for the three seed accounts (AUTH-2). Import `test` and `expect` from here
 * instead of from '@playwright/test':
 *
 *   import { expect, test } from '../support/fixtures.js';
 *
 *   // One user: the default `page` starts logged in.
 *   test.describe('My Projects', () => {
 *     test.use({ loginAs: 'owner' });
 *     test('...', async ({ page }) => { await page.goto('/projects'); });
 *   });
 *
 *   // Several users at once (permissions, CON-1): each page has its own isolated context.
 *   test('...', async ({ ownerPage, outsiderPage }) => { ... });
 *
 * Each worker logs every role in once, through the API (no UI), and reuses that session for
 * all its tests. Logging in never changes data, so sharing the session is safe; a test that
 * logs out or changes the password must log in itself instead (loginThroughApi).
 */

interface AuthOptions {
  /** A seed role to log the default `page` in as; unset keeps it logged out. */
  loginAs: SeedRole | undefined;
}

interface UserPages {
  ownerPage: Page;
  memberPage: Page;
  outsiderPage: Page;
}

interface WorkerFixtures {
  /** The session of a seed role, logged in once per worker and then reused. */
  seedSession: (role: SeedRole) => Promise<StorageState>;
}

/** A page in its own browser context (its own cookies), logged in as the role. */
async function usePageAs(
  browser: Browser,
  storageState: StorageState,
  use: (page: Page) => Promise<void>,
): Promise<void> {
  const context = await browser.newContext({ baseURL: E2E_BASE_URL, storageState });
  try {
    await use(await context.newPage());
  } finally {
    await context.close();
  }
}

export const test = base.extend<AuthOptions & UserPages, WorkerFixtures>({
  loginAs: [undefined, { option: true }],

  seedSession: [
    // eslint-disable-next-line no-empty-pattern -- Playwright reads the fixture's dependencies from this pattern; there are none.
    async ({}, use) => {
      const sessions = new Map<SeedRole, Promise<StorageState>>();
      await use((role) => {
        let session = sessions.get(role);
        if (!session) {
          session = loginThroughApi({ email: SEED_USERS[role].email, password: SEED_PASSWORD });
          sessions.set(role, session);
        }

        return session;
      });
    },
    { scope: 'worker' },
  ],

  storageState: async ({ loginAs, seedSession, storageState }, use) => {
    await use(loginAs ? await seedSession(loginAs) : storageState);
  },

  ownerPage: async ({ browser, seedSession }, use) => {
    await usePageAs(browser, await seedSession('owner'), use);
  },
  memberPage: async ({ browser, seedSession }, use) => {
    await usePageAs(browser, await seedSession('member'), use);
  },
  outsiderPage: async ({ browser, seedSession }, use) => {
    await usePageAs(browser, await seedSession('outsider'), use);
  },
});

export { expect } from '@playwright/test';
