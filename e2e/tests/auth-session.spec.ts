import type { Page } from '@playwright/test';

import { logInAsNewUser } from '../support/auth-api.js';
import { expect, test } from '../support/fixtures.js';
import { expireSessionToken, tamperWithSessionToken } from '../support/session-token.js';

// AUTH-4: the session lives in an HTTP-only cookie, so after a page refresh the app asks
// GET /api/auth/me who is logged in. A valid cookie keeps the user in; a broken or expired one
// sends them to the login popup. Each test uses its own new account (logInAsNewUser), so
// breaking its cookie never touches a session that other tests share.

/** The landing page with the Log in popup open (wireframe 01 B), where the guard sends visitors. */
async function expectLoginPopup(page: Page): Promise<void> {
  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('dialog', { name: 'Log in to Mini-Jira' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
}

test.describe('Session survives refresh (AUTH-4)', () => {
  test('AUTH-4: refreshing the page keeps the user logged in on the same page', async ({
    page,
    context,
  }) => {
    const { email } = await logInAsNewUser(context);
    await page.goto('/my-work');
    await expect(page.getByRole('heading', { level: 1, name: 'My Work' })).toBeVisible();

    const meResponse = page.waitForResponse('**/api/auth/me');
    await page.reload();

    expect((await meResponse).status()).toBe(200);
    await expect(page).toHaveURL('/my-work');
    await expect(page.getByRole('heading', { level: 1, name: 'My Work' })).toBeVisible();
    // The user menu knows who is logged in (wireframe 02 F).
    await page.getByRole('button', { name: 'Account menu' }).click();
    await expect(page.getByRole('dialog', { name: 'Account menu' }).getByText(email)).toBeVisible();
  });

  test('AUTH-4: a tampered session cookie sends the user to the login popup', async ({
    page,
    context,
  }) => {
    await logInAsNewUser(context);
    await tamperWithSessionToken(context);

    const meResponse = page.waitForResponse('**/api/auth/me');
    await page.goto('/projects');

    expect((await meResponse).status()).toBe(401);
    await expectLoginPopup(page);
  });

  test('AUTH-4: an expired session cookie sends the user to the login popup', async ({
    page,
    context,
  }) => {
    await logInAsNewUser(context);
    await expireSessionToken(context);

    const meResponse = page.waitForResponse('**/api/auth/me');
    await page.goto('/projects');

    expect((await meResponse).status()).toBe(401);
    await expectLoginPopup(page);
  });

  test('AUTH-4: a logged-in user who opens the landing page goes straight to My Projects', async ({
    page,
    context,
  }) => {
    await logInAsNewUser(context);

    await page.goto('/');

    await expect(page).toHaveURL('/projects');
    await expect(page.getByRole('heading', { level: 1, name: 'My Projects' })).toBeVisible();
  });
});
