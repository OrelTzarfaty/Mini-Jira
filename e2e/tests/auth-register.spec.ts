import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// AUTH-1 (wireframe 01 A and C): a visitor creates an account from the landing page and, logged
// in at once, lands on My Projects.

/** The login cookie the API sets (server/src/lib/auth-cookie.ts). */
const AUTH_COOKIE_NAME = 'mj_session';
/** A seeded demo account (server/prisma/seed.ts), so its email is always taken. */
const SEEDED_EMAIL = 'owner@minijira.test';
const PASSWORD = 'E2E-register-pass-1';

/** A new email for every run and every test, so tests never share an account. */
function uniqueEmail(): string {
  return `e2e-register-${randomUUID()}@minijira.test`;
}

/** Opens the landing page and the Register popup with the top bar's "Get started". */
async function openRegisterPopup(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('link', { name: 'Get started', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Create your account' })).toBeVisible();
}

async function fillRegisterForm(page: Page, email: string): Promise<void> {
  const dialog = page.getByRole('dialog', { name: 'Create your account' });
  await dialog.getByLabel('Name').fill('Erin E2E');
  await dialog.getByLabel('Email').fill(email);
  // exact: the "Show password" button would match a partial "Password" label too.
  await dialog.getByLabel('Password', { exact: true }).fill(PASSWORD);
}

test.describe('Register (AUTH-1)', () => {
  test('AUTH-1: a visitor registers from the landing page and lands on My Projects', async ({
    page,
    context,
  }) => {
    await openRegisterPopup(page);
    await fillRegisterForm(page, uniqueEmail());

    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL('/projects');
    await expect(page.getByRole('heading', { level: 1, name: 'My Projects' })).toBeVisible();
    // Register also logs in: the session is a cookie that page scripts can't read (XSS).
    const cookies = await context.cookies();
    const authCookie = cookies.find((cookie) => cookie.name === AUTH_COOKIE_NAME);
    expect(authCookie).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' });
  });

  test('AUTH-1: a taken email shows its error under Email and keeps the typed input', async ({
    page,
    context,
  }) => {
    await openRegisterPopup(page);
    await fillRegisterForm(page, SEEDED_EMAIL);
    const registerResponse = page.waitForResponse('**/api/auth/register');

    await page.getByRole('button', { name: 'Create account' }).click();

    expect((await registerResponse).status()).toBe(409);
    const dialog = page.getByRole('dialog', { name: 'Create your account' });
    const emailInput = dialog.getByLabel('Email');
    await expect(emailInput).toHaveAccessibleDescription('This email is already registered');
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    await expect(emailInput).toBeFocused();
    await expect(emailInput).toHaveValue(SEEDED_EMAIL);
    await expect(dialog.getByLabel('Name')).toHaveValue('Erin E2E');
    await expect(dialog.getByLabel('Password', { exact: true })).toHaveValue(PASSWORD);
    await expect(page).toHaveURL('/register');
    expect(await context.cookies()).not.toContainEqual(
      expect.objectContaining({ name: AUTH_COOKIE_NAME }),
    );
  });
});
