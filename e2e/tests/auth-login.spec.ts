import type { Locator, Page } from '@playwright/test';

import {
  AUTH_COOKIE_NAME,
  registerThroughApi,
  SEED_PASSWORD,
  SEED_USERS,
} from '../support/auth-api.js';
import { expect, test } from '../support/fixtures.js';

// AUTH-2 (wireframe 01 A and B): a visitor logs in from the landing page and lands on My
// Projects; wrong credentials show one generic message.

/** Shown for a wrong password and an unknown email alike (shared INVALID_CREDENTIALS_MESSAGE). */
const INVALID_CREDENTIALS_MESSAGE = 'Email or password is incorrect';

/** Opens the landing page and the Log in popup with the top bar's "Log in". */
async function openLoginPopup(page: Page): Promise<Locator> {
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Account' })
    .getByRole('link', { name: 'Log in' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Log in to Mini-Jira' });
  await expect(dialog).toBeVisible();

  return dialog;
}

async function fillLoginForm(dialog: Locator, email: string, password: string): Promise<void> {
  await dialog.getByLabel('Email').fill(email);
  // exact: the "Show password" button would match a partial "Password" label too.
  await dialog.getByLabel('Password', { exact: true }).fill(password);
}

test.describe('Log in (AUTH-2)', () => {
  test('AUTH-2: a user logs in from the landing page and lands on My Projects', async ({
    page,
    context,
  }) => {
    const dialog = await openLoginPopup(page);
    await fillLoginForm(dialog, SEED_USERS.owner.email, SEED_PASSWORD);

    await dialog.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL('/projects');
    await expect(page.getByRole('heading', { level: 1, name: 'My Projects' })).toBeVisible();
    // The session is a cookie that page scripts can't read (XSS).
    const cookies = await context.cookies();
    const authCookie = cookies.find((cookie) => cookie.name === AUTH_COOKIE_NAME);
    expect(authCookie).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' });
  });

  // A fresh account, not a seed one: failed logins count toward the login rate limit, and the
  // seed accounts must stay usable for the login fixtures.
  test('AUTH-2: a wrong password shows the generic message and keeps the typed input', async ({
    page,
    context,
  }) => {
    const { email } = await registerThroughApi();
    const dialog = await openLoginPopup(page);
    await fillLoginForm(dialog, email, 'wrong-password-1');
    const loginResponse = page.waitForResponse('**/api/auth/login');

    await dialog.getByRole('button', { name: 'Log in' }).click();

    expect((await loginResponse).status()).toBe(401);
    await expect(dialog.getByRole('alert')).toHaveText(INVALID_CREDENTIALS_MESSAGE);
    // The message belongs to the form, not to a field, so it can't hint which one was wrong.
    await expect(dialog.getByLabel('Email')).not.toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.getByLabel('Email')).toHaveValue(email);
    await expect(dialog.getByLabel('Password', { exact: true })).toHaveValue('wrong-password-1');
    await expect(page).toHaveURL('/login');
    expect(await context.cookies()).not.toContainEqual(
      expect.objectContaining({ name: AUTH_COOKIE_NAME }),
    );
  });
});
