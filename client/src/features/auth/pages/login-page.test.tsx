import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '@/test/render-route';

const LANDING_HEADLINE = "Plan, track and ship your team's work.";

async function findLoginPopup(): Promise<HTMLElement> {
  return screen.findByRole('dialog', { name: 'Log in to Mini-Jira' });
}

describe('Log in popup', () => {
  it('AUTH-2: /login shows the landing page with the popup open and focus in Email', async () => {
    renderRoute('/login');

    const popup = await findLoginPopup();

    // The landing page stays behind the popup (hidden from screen readers while it is open).
    expect(
      screen.getByRole('heading', { level: 1, name: LANDING_HEADLINE, hidden: true }),
    ).toBeInTheDocument();
    expect(document.title).toBe('Log in · Mini-Jira');
    await waitFor(() => {
      expect(within(popup).getByLabelText('Email')).toHaveFocus();
    });
    expect(within(popup).getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(within(popup).getByLabelText('Password')).toHaveAttribute(
      'autocomplete',
      'current-password',
    );
    expect(within(popup).getByRole('button', { name: 'Show password' })).toBeInTheDocument();
  });

  it('AUTH-2: "Log in" in the top bar opens the popup, and Esc closes it with focus back', async () => {
    const router = renderRoute('/');
    const accountNav = await screen.findByRole('navigation', { name: 'Account' });
    const logIn = within(accountNav).getByRole('link', { name: 'Log in' });

    await userEvent.click(logIn);

    await findLoginPopup();
    expect(router.state.location.pathname).toBe('/login');

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(document.title).toBe('Welcome · Mini-Jira');
    await waitFor(() => {
      expect(logIn).toHaveFocus();
    });
  });

  it('AUTH-2: "Create one" switches to the Register popup, and "Log in" switches back', async () => {
    const router = renderRoute('/login');
    const loginPopup = await findLoginPopup();

    await userEvent.click(within(loginPopup).getByRole('link', { name: 'Create one' }));

    const registerPopup = await screen.findByRole('dialog', { name: 'Create your account' });
    expect(router.state.location.pathname).toBe('/register');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    await waitFor(() => {
      expect(within(registerPopup).getByLabelText('Name')).toHaveFocus();
    });

    await userEvent.click(within(registerPopup).getByRole('link', { name: 'Log in' }));

    const loginAgain = await findLoginPopup();
    expect(router.state.location.pathname).toBe('/login');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    await waitFor(() => {
      expect(within(loginAgain).getByLabelText('Email')).toHaveFocus();
    });
  });

  it('AUTH-2: after a switch to Register, closing returns focus to the link that opened Log in', async () => {
    renderRoute('/');
    const accountNav = await screen.findByRole('navigation', { name: 'Account' });
    const logIn = within(accountNav).getByRole('link', { name: 'Log in' });
    await userEvent.click(logIn);
    const loginPopup = await findLoginPopup();
    await userEvent.click(within(loginPopup).getByRole('link', { name: 'Create one' }));
    await screen.findByRole('dialog', { name: 'Create your account' });

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(logIn).toHaveFocus();
    });
  });

  it('AUTH-2: empty fields show an error under each field, linked to it', async () => {
    renderRoute('/login');
    const popup = await findLoginPopup();

    await userEvent.click(within(popup).getByRole('button', { name: 'Log in' }));

    const email = within(popup).getByLabelText('Email');
    await waitFor(() => {
      expect(email).toHaveAccessibleDescription('Email is required');
    });
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveFocus();
    expect(within(popup).getByLabelText('Password')).toHaveAccessibleDescription(
      'Password is required',
    );
  });

  it('AUTH-2: a bad email shows the shared schema message, and a short password is allowed', async () => {
    renderRoute('/login');
    const popup = await findLoginPopup();
    await userEvent.type(within(popup).getByLabelText('Email'), 'ana@');
    await userEvent.type(within(popup).getByLabelText('Password'), 'short');

    await userEvent.click(within(popup).getByRole('button', { name: 'Log in' }));

    expect(await within(popup).findByText('Enter a valid email address')).toBeInTheDocument();
    // Login has no 8-character rule: an older account must still be able to log in.
    expect(within(popup).getByLabelText('Password')).toHaveAttribute('aria-invalid', 'false');
  });
});
