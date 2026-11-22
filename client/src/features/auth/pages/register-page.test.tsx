import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '@/test/render-route';

const LANDING_HEADLINE = "Plan, track and ship your team's work.";

async function findRegisterPopup(): Promise<HTMLElement> {
  return screen.findByRole('dialog', { name: 'Create your account' });
}

describe('Register popup', () => {
  it('AUTH-1: /register shows the landing page with the popup open and focus in Name', async () => {
    renderRoute('/register');

    const popup = await findRegisterPopup();

    // The landing page stays behind the popup (hidden from screen readers while it is open).
    expect(
      screen.getByRole('heading', { level: 1, name: LANDING_HEADLINE, hidden: true }),
    ).toBeInTheDocument();
    expect(document.title).toBe('Create your account · Mini-Jira');
    await waitFor(() => {
      expect(within(popup).getByLabelText('Name')).toHaveFocus();
    });
    expect(within(popup).getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(within(popup).getByLabelText('Password')).toHaveAccessibleDescription(
      'At least 8 characters',
    );
  });

  it('AUTH-1: "Get started" opens the popup at /register, and ✕ closes it with focus back', async () => {
    const router = renderRoute('/');
    const getStarted = await screen.findByRole('link', { name: "Get started — it's free" });

    await userEvent.click(getStarted);

    const popup = await findRegisterPopup();
    expect(router.state.location.pathname).toBe('/register');

    await userEvent.click(within(popup).getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(document.title).toBe('Welcome · Mini-Jira');
    await waitFor(() => {
      expect(getStarted).toHaveFocus();
    });
  });

  it('AUTH-1: Esc closes the popup and goes back to /', async () => {
    const router = renderRoute('/register');
    await findRegisterPopup();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });

  it('AUTH-1: a click on the dimmed page closes the popup', async () => {
    const router = renderRoute('/register');
    await findRegisterPopup();
    // The overlay has no role or name: it is the dimmed area outside the popup.
    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    expect(overlay).toBeInstanceOf(HTMLElement);

    await userEvent.click(overlay as HTMLElement);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });

  it('AUTH-1: empty fields show an error under each field, linked to it', async () => {
    renderRoute('/register');
    const popup = await findRegisterPopup();

    await userEvent.click(within(popup).getByRole('button', { name: 'Create account' }));

    const name = within(popup).getByLabelText('Name');
    await waitFor(() => {
      expect(name).toHaveAccessibleDescription('Name is required');
    });
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveFocus();
    expect(within(popup).getByLabelText('Email')).toHaveAccessibleDescription('Email is required');
    expect(within(popup).getByLabelText('Password')).toHaveAccessibleDescription(
      'At least 8 characters Password must be at least 8 characters',
    );
  });

  it('AUTH-1: a bad email and a short password show the shared schema messages', async () => {
    renderRoute('/register');
    const popup = await findRegisterPopup();
    await userEvent.type(within(popup).getByLabelText('Name'), 'Ana Levi');
    await userEvent.type(within(popup).getByLabelText('Email'), 'ana@');
    await userEvent.type(within(popup).getByLabelText('Password'), 'short');

    await userEvent.click(within(popup).getByRole('button', { name: 'Create account' }));

    expect(await within(popup).findByText('Enter a valid email address')).toBeInTheDocument();
    expect(within(popup).getByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(within(popup).getByLabelText('Name')).toHaveAttribute('aria-invalid', 'false');
  });

  it('AUTH-1: the eye button shows and hides the password', async () => {
    renderRoute('/register');
    const popup = await findRegisterPopup();
    const password = within(popup).getByLabelText('Password');
    const toggle = within(popup).getByRole('button', { name: 'Show password' });

    await userEvent.click(toggle);

    expect(password).toHaveAttribute('type', 'text');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(toggle);

    expect(password).toHaveAttribute('type', 'password');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('AUTH-1: "Log in" in the popup leads to /login', async () => {
    renderRoute('/register');
    const popup = await findRegisterPopup();

    expect(within(popup).getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
  });
});
