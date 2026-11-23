import { ErrorCode } from '@mini-jira/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { createQueryClient } from '@/api/query-client';
import { routes } from '@/routes';
import { renderRoute } from '@/test/render-route';
import { server } from '@/test/server';

const LOGOUT_URL = '/api/auth/logout';
const LOGOUT_FAILED_MESSAGE = "Couldn't log out. You're still logged in. Please try again.";
const LANDING_HEADING = "Plan, track and ship your team's work.";
// Stands for any server data the old session left in the cache.
const CACHED_QUERY_KEY = ['projects'];

/** Counts the logout requests, so a test can check the API was really called. */
function respondToLogout(response: () => Response | Promise<Response>): { count: () => number } {
  let requestCount = 0;
  server.use(
    http.post(LOGOUT_URL, () => {
      requestCount += 1;

      return response();
    }),
  );

  return { count: () => requestCount };
}

/** Opens My Projects with some cached server data, as if the user had been working. */
async function renderLoggedInApp(): Promise<{
  router: ReturnType<typeof renderRoute>;
  queryClient: ReturnType<typeof createQueryClient>;
}> {
  const queryClient = createQueryClient();
  queryClient.setQueryData(CACHED_QUERY_KEY, [{ key: 'WEB' }]);
  const router = renderRoute('/projects', routes, { queryClient });
  await screen.findByRole('main');

  return { router, queryClient };
}

async function openAccountMenu(): Promise<HTMLElement> {
  await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));

  return screen.getByRole('dialog', { name: 'Account menu' });
}

describe('Log out', () => {
  it('AUTH-3: logs out from the account menu, clears the cache, and lands on the landing page', async () => {
    const logout = respondToLogout(() => new HttpResponse(null, { status: 204 }));
    const { router, queryClient } = await renderLoggedInApp();

    const menu = await openAccountMenu();
    await userEvent.click(within(menu).getByRole('button', { name: 'Log out' }));

    expect(await screen.findByRole('heading', { level: 1, name: LANDING_HEADING })).toBeVisible();
    expect(logout.count()).toBe(1);
    expect(router.state.location.pathname).toBe('/');
    // replace: Back must not return to a page of the ended session.
    expect(router.state.historyAction).toBe('REPLACE');
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('AUTH-3: shows that it is working and ignores more clicks while logging out', async () => {
    let finishLogout = (): void => undefined;
    const logout = respondToLogout(
      () =>
        new Promise<Response>((resolve) => {
          finishLogout = () => {
            resolve(new HttpResponse(null, { status: 204 }));
          };
        }),
    );
    await renderLoggedInApp();
    const menu = await openAccountMenu();

    await userEvent.click(within(menu).getByRole('button', { name: 'Log out' }));
    const workingButton = await within(menu).findByRole('button', { name: 'Logging out…' });
    expect(workingButton).toHaveAttribute('aria-disabled', 'true');
    expect(workingButton).toHaveFocus();
    await userEvent.click(workingButton);

    expect(logout.count()).toBe(1);
    finishLogout();
    await waitFor(() => {
      expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
    });
  });

  it.each([
    [
      'the server fails',
      () =>
        HttpResponse.json(
          { error: { code: ErrorCode.INTERNAL_ERROR, message: 'Something went wrong' } },
          { status: 500 },
        ),
    ],
    ['the server cannot be reached', () => HttpResponse.error()],
  ])(
    'AUTH-3: when %s, says the user is still logged in and stays on the page',
    async (_case, response) => {
      respondToLogout(response);
      const { router, queryClient } = await renderLoggedInApp();
      const menu = await openAccountMenu();

      await userEvent.click(within(menu).getByRole('button', { name: 'Log out' }));

      expect(await within(menu).findByRole('alert')).toHaveTextContent(LOGOUT_FAILED_MESSAGE);
      // The button is back, so the user can try again from where they are.
      expect(within(menu).getByRole('button', { name: 'Log out' })).toHaveFocus();
      expect(router.state.location.pathname).toBe('/projects');
      expect(queryClient.getQueryData(CACHED_QUERY_KEY)).toEqual([{ key: 'WEB' }]);
    },
  );

  it('AUTH-3: the phone menu has Log out too', async () => {
    const logout = respondToLogout(() => new HttpResponse(null, { status: 204 }));
    const { router } = await renderLoggedInApp();

    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    const menu = screen.getByRole('dialog', { name: 'Menu' });
    // Opens on the first link, not on Log out, so Enter right away can't log out by mistake.
    await waitFor(() => {
      expect(within(menu).getByRole('link', { name: 'My Work' })).toHaveFocus();
    });
    await userEvent.click(within(menu).getByRole('button', { name: 'Log out' }));

    expect(await screen.findByRole('heading', { level: 1, name: LANDING_HEADING })).toBeVisible();
    expect(logout.count()).toBe(1);
    expect(router.state.location.pathname).toBe('/');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
