import {
  ErrorCode,
  INVALID_CREDENTIALS_MESSAGE,
  LOGIN_RATE_LIMITED_MESSAGE,
} from '@mini-jira/shared';
import type { ErrorResponse, PublicUser } from '@mini-jira/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '@/test/render-route';
import { server } from '@/test/server';

const LOGIN_URL = '/api/auth/login';
const USER: PublicUser = {
  id: '0b8c3a6e-1d2f-4e5a-9b7c-8d9e0f1a2b3c',
  name: 'Ana Levi',
  email: 'ana@example.com',
};

function respondWithError(status: number, error: ErrorResponse['error']): void {
  server.use(http.post(LOGIN_URL, () => HttpResponse.json({ error }, { status })));
}

interface FilledForm {
  popup: HTMLElement;
  router: ReturnType<typeof renderRoute>;
}

/** Opens /login and fills in a form that passes the client-side checks. */
async function fillValidForm(): Promise<FilledForm> {
  const router = renderRoute('/login');
  const popup = await screen.findByRole('dialog', { name: 'Log in to Mini-Jira' });
  await userEvent.type(within(popup).getByLabelText('Email'), 'Ana@Example.COM');
  await userEvent.type(within(popup).getByLabelText('Password'), 'correct horse');

  return { popup, router };
}

async function submit(popup: HTMLElement): Promise<void> {
  await userEvent.click(within(popup).getByRole('button', { name: 'Log in' }));
}

function expectTypedInputKept(popup: HTMLElement): void {
  expect(within(popup).getByLabelText('Email')).toHaveValue('Ana@Example.COM');
  expect(within(popup).getByLabelText('Password')).toHaveValue('correct horse');
}

describe('LoginForm submit', () => {
  it('AUTH-2: sends the cleaned email and lands on My Projects, replacing the history entry', async () => {
    let sentBody: unknown;
    server.use(
      http.post(LOGIN_URL, async ({ request }) => {
        sentBody = await request.json();

        return HttpResponse.json(USER);
      }),
    );
    const { popup, router } = await fillValidForm();

    await submit(popup);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'My Projects' }),
    ).toBeInTheDocument();
    expect(sentBody).toEqual({ email: 'ana@example.com', password: 'correct horse' });
    expect(router.state.location.pathname).toBe('/projects');
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('AUTH-2: the button is disabled and says so while logging in', async () => {
    const { promise: serverCanAnswer, resolve: letServerAnswer } = Promise.withResolvers<void>();
    server.use(
      http.post(LOGIN_URL, async () => {
        await serverCanAnswer;

        return HttpResponse.json(USER);
      }),
    );
    const { popup } = await fillValidForm();

    await submit(popup);

    expect(await within(popup).findByRole('button', { name: 'Logging in…' })).toBeDisabled();

    letServerAnswer();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'My Projects' }),
    ).toBeInTheDocument();
  });

  it('AUTH-2: 401 INVALID_CREDENTIALS shows one generic alert, under no field, and keeps the input', async () => {
    respondWithError(401, {
      code: ErrorCode.INVALID_CREDENTIALS,
      message: 'Invalid email or password',
    });
    const { popup, router } = await fillValidForm();

    await submit(popup);

    expect(await within(popup).findByRole('alert')).toHaveTextContent(INVALID_CREDENTIALS_MESSAGE);
    expect(within(popup).getByLabelText('Email')).toHaveAttribute('aria-invalid', 'false');
    expect(within(popup).getByLabelText('Password')).toHaveAttribute('aria-invalid', 'false');
    expectTypedInputKept(popup);
    expect(within(popup).getByRole('button', { name: 'Log in' })).toBeEnabled();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('AUTH-2: 429 RATE_LIMITED shows the rate-limit alert', async () => {
    respondWithError(429, { code: ErrorCode.RATE_LIMITED, message: 'Too many requests' });
    const { popup } = await fillValidForm();

    await submit(popup);

    expect(await within(popup).findByRole('alert')).toHaveTextContent(LOGIN_RATE_LIMITED_MESSAGE);
    expectTypedInputKept(popup);
  });

  it("AUTH-2: 400 VALIDATION_ERROR puts the server's details under their fields", async () => {
    respondWithError(400, {
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Invalid request',
      details: [{ field: 'email', message: 'Email must be at most 254 characters' }],
    });
    const { popup } = await fillValidForm();

    await submit(popup);

    const email = within(popup).getByLabelText('Email');
    await waitFor(() => {
      expect(email).toHaveAccessibleDescription('Email must be at most 254 characters');
    });
    expect(email).toHaveFocus();
    expect(within(popup).queryByRole('alert')).not.toBeInTheDocument();
    expectTypedInputKept(popup);
  });

  it('AUTH-2: a 500 shows one "something went wrong" alert and keeps the input', async () => {
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
  });

  it('AUTH-2: no answer from the server shows the connection alert', async () => {
    server.use(http.post(LOGIN_URL, () => HttpResponse.error()));
    const { popup } = await fillValidForm();

    await submit(popup);

    expect(await within(popup).findByRole('alert')).toHaveTextContent(
      "Couldn't reach the server. Check your connection and try again.",
    );
    expectTypedInputKept(popup);
  });
});
