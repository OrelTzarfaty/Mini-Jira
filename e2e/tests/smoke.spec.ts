import { expect, test } from '@playwright/test';

// Proves that the whole system runs: nginx serves the React app and forwards /api to the API.
// A placeholder for the real journeys; the login test grows with AUTH-2.
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

    await expect(page.getByRole('heading', { level: 1, name: 'Log in' })).toBeVisible();
    await expect(page).toHaveTitle(/Log in/);
    expect(consoleErrors).toEqual([]);
  });
});
