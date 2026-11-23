import type { Page } from '@playwright/test';

import { AUTH_COOKIE_NAME } from '../support/auth-api.js';
import { expect, test } from '../support/fixtures.js';

// AUTH-2: the login fixtures every later E2E test relies on. If they broke, every multi-user
// test would fail in a confusing way, so they are checked once here on their own.

/** The user ID inside the page's session cookie (the JWT's `sub`), or undefined if logged out. */
async function sessionUserId(page: Page): Promise<string | undefined> {
  const cookies = await page.context().cookies();
  const authCookie = cookies.find((cookie) => cookie.name === AUTH_COOKIE_NAME);
  if (!authCookie) {
    return undefined;
  }
  expect(authCookie).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' });
  const payload = authCookie.value.split('.')[1] ?? '';

  return (JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub?: string }).sub;
}

test.describe('Login fixtures (AUTH-2)', () => {
  test('AUTH-2: ownerPage, memberPage and outsiderPage are logged in as three different users', async ({
    ownerPage,
    memberPage,
    outsiderPage,
  }) => {
    const userIds = await Promise.all([ownerPage, memberPage, outsiderPage].map(sessionUserId));

    expect(userIds).toEqual([expect.any(String), expect.any(String), expect.any(String)]);
    expect(new Set(userIds).size).toBe(3);
  });

  test('AUTH-2: without loginAs the default page is logged out', async ({ page }) => {
    expect(await sessionUserId(page)).toBeUndefined();
  });

  test.describe('with loginAs', () => {
    test.use({ loginAs: 'member' });

    test('AUTH-2: loginAs logs the default page in as that seed user', async ({
      page,
      memberPage,
    }) => {
      const userId = await sessionUserId(page);

      expect(userId).toEqual(expect.any(String));
      expect(userId).toBe(await sessionUserId(memberPage));
    });
  });
});
