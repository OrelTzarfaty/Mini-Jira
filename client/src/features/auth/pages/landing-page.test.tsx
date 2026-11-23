import { screen, within } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '@/test/render-route';
import { server } from '@/test/server';
import { mockLoggedIn } from '@/test/session';

describe('LandingPage', () => {
  it('AUTH-1: shows the headline, the pitch, and a tab title', async () => {
    renderRoute('/');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: "Plan, track and ship your team's work.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Projects, tickets and a drag-and-drop board. Simple enough for small teams.',
      ),
    ).toBeInTheDocument();
    expect(document.title).toBe('Welcome · Mini-Jira');
  });

  it('AUTH-1: the hero photo is decoration that screen readers skip', async () => {
    renderRoute('/');
    await screen.findByRole('heading', { level: 1 });

    // An empty alt gives the image the "presentation" role, so it isn't listed as an image.
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('AUTH-1: "Log in" leads to /login and both "Get started" buttons lead to /register', async () => {
    renderRoute('/');
    const accountNav = await screen.findByRole('navigation', { name: 'Account' });

    expect(within(accountNav).getByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(within(accountNav).getByRole('link', { name: 'Get started' })).toHaveAttribute(
      'href',
      '/register',
    );
    expect(screen.getByRole('link', { name: "Get started — it's free" })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  it.each(['/', '/login', '/register'])(
    'AUTH-4: a logged-in user who opens %s goes straight to My Projects',
    async (path) => {
      mockLoggedIn();

      const router = renderRoute(path);

      expect(
        await screen.findByRole('heading', { level: 1, name: 'My Projects' }),
      ).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/projects');
      expect(router.state.historyAction).toBe('REPLACE');
    },
  );

  it('AUTH-4: a visitor sees the page before the API says who is logged in', () => {
    // Never answers, so the page can't be waiting for it.
    server.use(http.get('/api/auth/me', () => new Promise<never>(() => undefined)));

    renderRoute('/');

    expect(
      screen.getByRole('heading', { level: 1, name: "Plan, track and ship your team's work." }),
    ).toBeInTheDocument();
  });
});
