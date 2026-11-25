import type { ConsoleMessage, Page } from '@playwright/test';

/**
 * AUTH-4: every page asks GET /api/auth/me who is logged in, and for a visitor it answers 401
 * by design. Chromium logs every 4xx response as a console error, so that one message is
 * expected. Only it is skipped: a 401 from any other URL, or any other status from /me (a 500,
 * for example), still counts.
 */
function isVisitorMeResponse(message: ConsoleMessage): boolean {
  const text = message.text();

  return (
    text.startsWith('Failed to load resource') &&
    text.includes('status of 401') &&
    message.location().url.endsWith('/api/auth/me')
  );
}

/**
 * Collects the page's console errors and uncaught exceptions from now on. The returned list
 * fills up as they happen; a test checks it is still empty at the end.
 */
export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !isVisitorMeResponse(message)) {
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));

  return errors;
}
