import { ErrorCode } from '@mini-jira/shared';
import type { ErrorResponse, PublicUser } from '@mini-jira/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '@/test/render-route';
import { server } from '@/test/server';

const REGISTER_URL = '/api/auth/register';
const NEW_USER: PublicUser = {
  id: '0b8c3a6e-1d2f-4e5a-9b7c-8d9e0f1a2b3c',
  name: 'Ana Levi',
  email: 'ana@example.com',
};

function respondWithError(status: number, error: ErrorResponse['error']): void {
  server.use(http.post(REGISTER_URL, () => HttpResponse.json({ error }, { status })));
}

interface FilledForm {
  popup: HTMLElement;
  router: ReturnType<typeof renderRoute>;
}

/** Opens /register and fills in a form that passes the client-side checks. */
async function fillValidForm(): Promise<FilledForm> {
  const router = renderRoute('/register');
  const popup = await screen.findByRole('dialog', { name: 'Create your account' });
  await userEvent.type(within(popup).getByLabelText('Name'), 'Ana Levi');
  await userEvent.type(within(popup).getByLabelText('Email'), 'Ana@Example.COM');
  await userEvent.type(within(popup).getByLabelText('Password'), 'correct horse');

  return { popup, router };
}

async function submit(popup: HTMLElement): Promise<void> {
  await userEvent.click(within(popup).getByRole('button', { name: 'Create account' }));
}

function expectTypedInputKept(popup: HTMLElement): void {
  expect(within(popup).getByLabelText('Name')).toHaveValue('Ana Levi');
  expect(within(popup).getByLabelText('Email')).toHaveValue('Ana@Example.COM');
  expect(within(popup).getByLabelText('Password')).toHaveValue('correct horse');
}

describe('RegisterForm submit', () => {
  it('AUTH-1: sends the cleaned form and lands on My Projects, replacing the history entry', async () => {
    let sentBody: unknown;
    server.use(
      http.post(REGISTER_URL, async ({ request }) => {
        sentBody = await request.json();

        return HttpResponse.json(NEW_USER, { status: 201 });
      }),
    );
    const { popup, router } = await fillValidForm();

    await submit(popup);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'My Projects' }),
    ).toBeInTheDocument();
    expect(sentBody).toEqual({
      name: 'Ana Levi',
      email: 'ana@example.com',
      password: 'correct horse',
    });
    expect(router.state.location.pathname).toBe('/projects');
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('AUTH-1: the button is disabled and says so while the account is being created', async () => {
    const { promise: serverCanAnswer, resolve: letServerAnswer } = Promise.withResolvers<void>();
    server.use(
      http.post(REGISTER_URL, async () => {
        await serverCanAnswer;

        return HttpResponse.json(NEW_USER, { status: 201 });
      }),
    );
    const { popup } = await fillValidForm();

    await submit(popup);

    expect(await within(popup).findByRole('button', { name: 'Creating account…' })).toBeDisabled();

    letServerAnswer();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'My Projects' }),
    ).toBeInTheDocument();
  });

  it('AUTH-1: 409 EMAIL_TAKEN shows the error under Email and keeps what was typed', async () => {
    respondWithError(409, { code: ErrorCode.EMAIL_TAKEN, message: 'Email already registered' });
    const { popup, router } = await fillValidForm();

    await submit(popup);

    const email = within(popup).getByLabelText('Email');
    await waitFor(() => {
      expect(email).toHaveAccessibleDescription('This email is already registered');
    });
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveFocus();
    expectTypedInputKept(popup);
    expect(within(popup).getByRole('button', { name: 'Create account' })).toBeEnabled();
    expect(router.state.location.pathname).toBe('/register');
  });

  it("AUTH-1: 400 VALIDATION_ERROR puts each of the server's details under its field", async () => {
    respondWithError(400, {
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Name is too long',
      details: [
        { field: 'name', message: 'Name must be at most 100 characters' },
        { field: 'password', message: 'Password is too common' },
      ],
    });
    const { popup } = await fillValidForm();

    await submit(popup);

    const name = within(popup).getByLabelText('Name');
    await waitFor(() => {
      expect(name).toHaveAccessibleDescription('Name must be at most 100 characters');
    });
    expect(name).toHaveFocus();
    expect(within(popup).getByLabelText('Password')).toHaveAccessibleDescription(
      'At least 8 characters Password is too common',
    );
    expect(within(popup).queryByRole('alert')).not.toBeInTheDocument();
    expectTypedInputKept(popup);
  });

  it('AUTH-1: a 500 shows one alert above the button and keeps what was typed', async () => {
    respondWithError(500, {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Something went wrong. Please try again.',
    });
    const { popup } = await fillValidForm();

    await submit(popup);

    expect(await within(popup).findByRole('alert')).toHaveTextContent(
      'Something went wrong. Please try again.',
    );
    expectTypedInputKept(popup);
    expect(within(popup).getByRole('button', { name: 'Create account' })).toBeEnabled();
  });

  it('AUTH-1: no answer from the server shows the connection alert', async () => {
    server.use(http.post(REGISTER_URL, () => HttpResponse.error()));
    const { popup } = await fillValidForm();

    await submit(popup);

    expect(await within(popup).findByRole('alert')).toHaveTextContent(
      "Couldn't reach the server. Check your connection and try again.",
    );
    expectTypedInputKept(popup);
  });

  it('AUTH-1: an error without field details, such as 403 FORBIDDEN, shows its message as the alert', async () => {
    respondWithError(403, { code: ErrorCode.FORBIDDEN, message: 'Request origin not allowed' });
    const { popup } = await fillValidForm();

    await submit(popup);

    expect(await within(popup).findByRole('alert')).toHaveTextContent('Request origin not allowed');
  });
});
