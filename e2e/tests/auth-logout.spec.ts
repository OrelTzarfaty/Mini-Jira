import type { BrowserContext, Locator, Page } from '@playwright/test';

import { AUTH_COOKIE_NAME, registerThroughApi } from '../support/auth-api.js';
import { expect, test } from '../support/fixtures.js';

// AUTH-3 (wireframe 02 F and H): a logged-in user logs out from the user menu (the ☰ menu on
// phones), the browser drops the session cookie, and the landing page opens.
// After logout, protected pages redirecting to login is checked in AUTH-4 (the guard is built
// there; the owner's decision of 2026-11-23).

/**
 * Logs the context in as a new account with its own session (register logs the user in).
 * - Not the shared worker session of the fixtures (`loginAs`): a test that logs out must never
 *   end a session that other tests use.
 * - Not a fresh login of a seed account: the login rate limiter counts each login while it is
 *   in flight, so several parallel logins of one account can get 429 even with the right
 *   password, and the test would be flaky.
 */
async function logInFresh(context: BrowserContext): Promise<void> {
  const { session } = await registerThroughApi();
  await context.addCookies(session.cookies);
}

/** Whether the browser still holds the session cookie (it is HTTP-only, so only the context sees it). */
async function hasSessionCookie(context: BrowserContext): Promise<boolean> {
  const cookies = await context.cookies();

  return cookies.some((cookie) => cookie.name === AUTH_COOKIE_NAME);
}

/** Clicks Log out in the menu and returns the status of the logout request it sent. */
async function logOutFrom(page: Page, menu: Locator): Promise<number> {
  const logoutResponse = page.waitForResponse('**/api/auth/logout');
  await menu.getByRole('button', { name: 'Log out' }).click();

  return (await logoutResponse).status();
}

/** The landing page for visitors: its top bar offers Log in again (wireframe 01 A). */
async function expectLandingPage(page: Page): Promise<void> {
  await expect(page).toHaveURL('/');
  await expect(page).toHaveTitle(/Welcome/);
  await expect(
    page.getByRole('navigation', { name: 'Account' }).getByRole('link', { name: 'Log in' }),
  ).toBeVisible();
}

test.describe('Log out (AUTH-3)', () => {
  test('AUTH-3: a user logs out from the account menu, the session cookie is removed, and the landing page opens', async ({
    page,
    context,
  }) => {
    await logInFresh(context);
    await page.goto('/projects');
    expect(await hasSessionCookie(context)).toBe(true);
    await page.getByRole('button', { name: 'Account menu' }).click();
    const menu = page.getByRole('dialog', { name: 'Account menu' });

    const status = await logOutFrom(page, menu);

    expect(status).toBe(204);
    await expectLandingPage(page);
    // The API's Set-Cookie matched the cookie's name and path, so the browser really deleted it.
    expect(await hasSessionCookie(context)).toBe(false);
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('AUTH-3: a user logs out from the ☰ menu and the landing page opens', async ({
      page,
      context,
    }) => {
      await logInFresh(context);
      await page.goto('/projects');
      // On phones the account menu moves into the ☰ menu (wireframe 02 H).
      await expect(page.getByRole('button', { name: 'Account menu' })).toBeHidden();
      await page.getByRole('button', { name: 'Menu', exact: true }).click();
      const menu = page.getByRole('dialog', { name: 'Menu' });

      const status = await logOutFrom(page, menu);

      expect(status).toBe(204);
      await expectLandingPage(page);
      await expect(menu).toBeHidden();
      expect(await hasSessionCookie(context)).toBe(false);
    });
  });
});
