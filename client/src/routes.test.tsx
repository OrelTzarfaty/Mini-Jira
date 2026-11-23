import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '@/test/render-route';

describe('routes', () => {
  it.each([
    ['/login', 'Log in'],
    ['/projects', 'My Projects'],
    ['/projects/WEB/board', 'WEB board'],
    ['/projects/WEB/list?status=TODO&page=2', 'WEB list'],
    ['/projects/WEB/tickets/WEB-12', 'WEB-12'],
    ['/projects/WEB/settings', 'WEB settings'],
    ['/my-work', 'My Work'],
  ])('SETUP-5: %s shows the "%s" page with a matching tab title', async (path, title) => {
    renderRoute(path);

    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(document.title).toBe(`${title} · Mini-Jira`);
  });

  it('SETUP-5: an unknown URL shows "Page not found" with a way back home', async () => {
    renderRoute('/projects/WEB/unknown');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(document.title).toBe('Page not found · Mini-Jira');

    await userEvent.click(screen.getByRole('link', { name: 'Go to the home page' }));

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: "Plan, track and ship your team's work.",
      }),
    ).toBeInTheDocument();
  });
});
