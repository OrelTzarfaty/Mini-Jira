import { expect, test } from '@playwright/test';

// Proves that the whole system runs: nginx serves the React app and forwards /api to the API.
// The real journeys live in their own specs (auth-register, auth-login).
test.describe('Smoke', () => {
  test('SETUP-9: the API health check answers through nginx', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  test('SETUP-9: the login page renders without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    await page.goto('/login');

    // AUTH-2: /login is the landing page with the Log in popup open (wireframe 01 B).
    await expect(page.getByRole('dialog', { name: 'Log in to Mini-Jira' })).toBeVisible();
    await expect(page).toHaveTitle(/Log in/);
    expect(consoleErrors).toEqual([]);
  });
});
