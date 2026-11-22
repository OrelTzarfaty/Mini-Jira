import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '@/test/render-route';

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
});
