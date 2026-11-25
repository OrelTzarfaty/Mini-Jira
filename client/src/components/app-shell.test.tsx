import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '@/test/render-route';
import { mockLoggedIn, TEST_USER } from '@/test/session';

function getMainNavigation(): HTMLElement {
  return screen.getByRole('navigation', { name: 'Main' });
}

/** The top bar appears once the API has said who is logged in (AUTH-4). */
async function waitForTopBar(): Promise<void> {
  await screen.findByRole('banner');
}

describe('AppShell', () => {
  it('SETUP-5: frames the page with a header, the main navigation, and a main area', async () => {
    mockLoggedIn();
    renderRoute('/projects');

    const heading = await screen.findByRole('heading', { level: 1, name: 'My Projects' });
    expect(screen.getByRole('banner')).toContainElement(getMainNavigation());
    expect(screen.getByRole('main')).toContainElement(heading);
    expect(heading).toBeVisible();
  });

  it('SETUP-5: the skip link is the first Tab stop and points to the main area', async () => {
    mockLoggedIn();
    renderRoute('/projects');
    await waitForTopBar();

    await userEvent.tab();

    const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skipLink).toHaveFocus();
    expect(skipLink).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('SETUP-5: Tab moves through the top bar from left to right', async () => {
    mockLoggedIn();
    renderRoute('/projects');
    await waitForTopBar();
    const navigation = getMainNavigation();

    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole('link', { name: 'Mini-Jira' })).toHaveFocus();
    await userEvent.tab();
    expect(within(navigation).getByRole('button', { name: 'Projects' })).toHaveFocus();
    await userEvent.tab();
    expect(within(navigation).getByRole('link', { name: 'My Work' })).toHaveFocus();
  });

  it('SETUP-5: marks the link to the current page and navigates between pages', async () => {
    mockLoggedIn();
    renderRoute('/projects');
    await waitForTopBar();

    await userEvent.click(within(getMainNavigation()).getByRole('link', { name: 'My Work' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'My Work' })).toBeInTheDocument();
    expect(within(getMainNavigation()).getByRole('link', { name: 'My Work' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('SETUP-5: the logo goes to My Projects', async () => {
    mockLoggedIn();
    renderRoute('/my-work');
    await waitForTopBar();

    await userEvent.click(screen.getByRole('link', { name: 'Mini-Jira' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'My Projects' }),
    ).toBeInTheDocument();
  });

  it('SETUP-5: the phone menu opens My Work and closes itself', async () => {
    mockLoggedIn();
    renderRoute('/projects');
    await waitForTopBar();

    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    const menu = screen.getByRole('dialog', { name: 'Menu' });
    await userEvent.click(within(menu).getByRole('link', { name: 'My Work' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'My Work' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('SETUP-5: Escape closes the phone menu and returns focus to the menu button', async () => {
    mockLoggedIn();
    renderRoute('/projects');
    await waitForTopBar();
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

      // hidden: on /register the page sits behind the popup, hidden from screen readers.
      await screen.findByRole('main', { hidden: true });
      // The landing page has its own visitor bar (wireframe 01), so look for the app's links.
      expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
    },
  );
});

describe('AppShell user menu', () => {
  it("AUTH-4: the account button shows the user's initials, and the menu their name and email above Log out", async () => {
    mockLoggedIn();
    renderRoute('/projects');
    await waitForTopBar();

    const accountButton = screen.getByRole('button', { name: 'Account menu' });
    expect(accountButton).toHaveTextContent('DL');
    await userEvent.click(accountButton);

    const menu = screen.getByRole('dialog', { name: 'Account menu' });
    expect(within(menu).getByText(TEST_USER.name)).toBeVisible();
    expect(within(menu).getByText(TEST_USER.email)).toBeVisible();
    expect(within(menu).getByRole('button', { name: 'Log out' })).toBeVisible();
  });

  it('AUTH-4: the phone menu shows the name and email above Log out', async () => {
    mockLoggedIn();
    renderRoute('/projects');
    await waitForTopBar();

    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));

    const menu = screen.getByRole('dialog', { name: 'Menu' });
    expect(within(menu).getByText(TEST_USER.name)).toBeVisible();
    expect(within(menu).getByText(TEST_USER.email)).toBeVisible();
    expect(within(menu).getByRole('button', { name: 'Log out' })).toBeVisible();
  });
});
