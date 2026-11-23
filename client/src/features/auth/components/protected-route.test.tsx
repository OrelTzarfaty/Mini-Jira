import { ErrorCode } from '@mini-jira/shared';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/api/api-error';
import { createQueryClient } from '@/api/query-client';
import { ME_QUERY_KEY } from '@/api/query-keys';
import { routes } from '@/routes';
import { renderRoute } from '@/test/render-route';
import { server } from '@/test/server';
import { mockLoggedIn, TEST_USER } from '@/test/session';

const ME_URL = '/api/auth/me';
const LOGIN_POPUP = 'Log in to Mini-Jira';

/** Holds GET /api/auth/me open until the test lets it answer with the user. */
function holdMeRequest(): { answer: () => void } {
  let answer = (): void => undefined;
  server.use(
    http.get(
      ME_URL,
      () =>
        new Promise<Response>((resolve) => {
          answer = () => {
            resolve(HttpResponse.json(TEST_USER));
          };
        }),
    ),
  );

  return { answer: () => answer() };
}

describe('ProtectedRoute', () => {
  it('AUTH-4: shows an accessible loading state, then the page of a logged-in user', async () => {
    const meRequest = holdMeRequest();

    renderRoute('/my-work');

    expect(await screen.findByRole('status')).toHaveTextContent('Loading your account');
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    meRequest.answer();
    expect(await screen.findByRole('heading', { level: 1, name: 'My Work' })).toBeVisible();
    expect(screen.queryByText('Loading your account')).not.toBeInTheDocument();
  });

  it.each(['/projects', '/projects/WEB/board', '/my-work'])(
    'AUTH-4: a visitor who opens %s is sent to the login popup, replacing the history entry',
    async (path) => {
      const router = renderRoute(path);

      expect(await screen.findByRole('dialog', { name: LOGIN_POPUP })).toBeVisible();
      expect(router.state.location.pathname).toBe('/login');
      expect(router.state.historyAction).toBe('REPLACE');
      expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
    },
  );

  it('AUTH-4: when the check fails, shows an error with Try again, which loads the page', async () => {
    let requestCount = 0;
    server.use(
      http.get(ME_URL, () => {
        requestCount += 1;

        return requestCount === 1
          ? HttpResponse.json(
              { error: { code: ErrorCode.FORBIDDEN, message: 'Forbidden' } },
              { status: 403 },
            )
          : HttpResponse.json(TEST_USER);
      }),
    );
    const router = renderRoute('/projects');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't load your account.");
    expect(router.state.location.pathname).toBe('/projects');
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'My Projects' }),
    ).toBeInTheDocument();
    expect(requestCount).toBe(2);
  });

  it('AUTH-4: a 401 UNAUTHENTICATED from a later request sends the user to the login popup', async () => {
    mockLoggedIn();
    const queryClient = createQueryClient();
    const router = renderRoute('/projects', routes, { queryClient });
    await screen.findByRole('banner');

    // Stands for any page's request after the session ended.
    await queryClient
      .fetchQuery({
        queryKey: ['projects'],
        queryFn: () =>
          Promise.reject(
            new ApiError({
              status: 401,
              code: ErrorCode.UNAUTHENTICATED,
              message: 'You are not logged in',
            }),
          ),
      })
      .catch(() => undefined);

    expect(await screen.findByRole('dialog', { name: LOGIN_POPUP })).toBeVisible();
    expect(router.state.location.pathname).toBe('/login');
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  it('AUTH-4: a user the app already knows sees the page at once, without asking the API again', async () => {
    let requestCount = 0;
    server.use(
      http.get(ME_URL, () => {
        requestCount += 1;

        return HttpResponse.json(TEST_USER);
      }),
    );
    const queryClient = createQueryClient();
    // As after login or register (startSession).
    queryClient.setQueryData(ME_QUERY_KEY, TEST_USER);

    renderRoute('/projects', routes, { queryClient });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'My Projects' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(requestCount).toBe(0);
  });
});
