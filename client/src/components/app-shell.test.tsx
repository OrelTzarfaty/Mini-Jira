import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '@/test/render-route';

function getMainNavigation(): HTMLElement {
  return screen.getByRole('navigation', { name: 'Main' });
}

describe('AppShell', () => {
  it('SETUP-5: frames the page with a header, the main navigation, and a main area', async () => {
    renderRoute('/projects');

    const main = await screen.findByRole('main');
    expect(screen.getByRole('banner')).toContainElement(getMainNavigation());
    expect(within(main).getByRole('heading', { level: 1, name: 'My Projects' })).toBeVisible();
  });

  it('SETUP-5: the skip link is the first Tab stop and points to the main area', async () => {
    renderRoute('/projects');
    await screen.findByRole('main');

    await userEvent.tab();

    const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skipLink).toHaveFocus();
    expect(skipLink).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('SETUP-5: Tab moves through the top bar from left to right', async () => {
    renderRoute('/projects');
    await screen.findByRole('main');
    const navigation = getMainNavigation();

    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole('link', { name: 'Mini-Jira' })).toHaveFocus();
    await userEvent.tab();
    expect(within(navigation).getByRole('link', { name: 'Projects' })).toHaveFocus();
    await userEvent.tab();
    expect(within(navigation).getByRole('link', { name: 'My Work' })).toHaveFocus();
  });

  it('SETUP-5: marks the link to the current page and navigates between pages', async () => {
    renderRoute('/projects');
    await screen.findByRole('main');

    await userEvent.click(within(getMainNavigation()).getByRole('link', { name: 'My Work' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'My Work' })).toBeInTheDocument();
    expect(within(getMainNavigation()).getByRole('link', { name: 'My Work' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(getMainNavigation()).getByRole('link', { name: 'Projects' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('SETUP-5: the logo goes to My Projects', async () => {
    renderRoute('/my-work');
    await screen.findByRole('main');

    await userEvent.click(screen.getByRole('link', { name: 'Mini-Jira' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'My Projects' }),
    ).toBeInTheDocument();
  });

  it('SETUP-5: the phone menu opens My Work and closes itself', async () => {
    renderRoute('/projects');
    await screen.findByRole('main');

    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    const menu = screen.getByRole('dialog', { name: 'Menu' });
    await userEvent.click(within(menu).getByRole('link', { name: 'My Work' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'My Work' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('SETUP-5: Escape closes the phone menu and returns focus to the menu button', async () => {
    renderRoute('/projects');
    await screen.findByRole('main');
    const menuButton = screen.getByRole('button', { name: 'Menu' });
    await userEvent.click(menuButton);

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(menuButton).toHaveFocus();
    });
  });

  it.each(['/', '/login', '/register', '/no-such-page'])(
    'SETUP-5: %s has no top bar, because visitors are not logged in',
    async (path) => {
      renderRoute(path);

      await screen.findByRole('main');
      expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    },
  );
});
