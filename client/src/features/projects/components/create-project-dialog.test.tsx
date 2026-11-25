import { ErrorCode, PROJECT_KEY_TAKEN_MESSAGE } from '@mini-jira/shared';
import type { ErrorResponse, Project } from '@mini-jira/shared';
import type { QueryClient } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { createQueryClient } from '@/api/query-client';
import { PROJECTS_QUERY_KEY } from '@/api/query-keys';
import { mockProject } from '@/test/project';
import { renderRoute } from '@/test/render-route';
import { server } from '@/test/server';
import { mockLoggedIn } from '@/test/session';

const PROJECTS_URL = '/api/projects';
const NEW_PROJECT: Project = {
  id: '3d2c1b0a-9f8e-4d7c-8b6a-5f4e3d2c1b0a',
  key: 'WEB',
  name: 'Website Redesign',
  description: null,
  role: 'OWNER',
  createdAt: '2026-11-24T10:00:00.000Z',
  updatedAt: '2026-11-24T10:00:00.000Z',
};

function respondWithError(status: number, error: ErrorResponse['error']): void {
  server.use(http.post(PROJECTS_URL, () => HttpResponse.json({ error }, { status })));
}

interface OpenedPopup {
  popup: HTMLElement;
  router: ReturnType<typeof renderRoute>;
}

/** Opens My Projects as a logged-in user and clicks "Create project". */
async function openPopup(queryClient: QueryClient = createQueryClient()): Promise<OpenedPopup> {
  mockLoggedIn();
  const router = renderRoute('/projects', undefined, { queryClient });
  await userEvent.click(await screen.findByRole('button', { name: 'Create project' }));
  const popup = await screen.findByRole('dialog', { name: 'Create project' });

  return { popup, router };
}

/** Fills in a form that passes the client-side checks. */
async function fillValidForm(): Promise<OpenedPopup> {
  const opened = await openPopup();
  const { popup } = opened;
  await userEvent.type(within(popup).getByLabelText('Name'), 'Website Redesign');
  await userEvent.clear(within(popup).getByLabelText('Key'));
  await userEvent.type(within(popup).getByLabelText('Key'), 'web');
  await userEvent.type(within(popup).getByLabelText('Description (optional)'), 'New site');

  return opened;
}

async function submit(popup: HTMLElement): Promise<void> {
  await userEvent.click(within(popup).getByRole('button', { name: 'Create' }));
}

function expectTypedInputKept(popup: HTMLElement): void {
  expect(within(popup).getByLabelText('Name')).toHaveValue('Website Redesign');
  expect(within(popup).getByLabelText('Key')).toHaveValue('WEB');
  expect(within(popup).getByLabelText('Description (optional)')).toHaveValue('New site');
}

describe('CreateProjectDialog', () => {
  it('PRJ-1: the Key field keeps only uppercase letters, at most 6', async () => {
    const { popup } = await openPopup();
    const key = within(popup).getByLabelText('Key');

    await userEvent.type(key, 'we-b 2é');
    expect(key).toHaveValue('WEB');

    await userEvent.type(key, 'abcdef');
    expect(key).toHaveValue('WEBABC');
  });

  it('PRJ-1: suggests the key from the name while typing', async () => {
    const { popup } = await openPopup();
    const name = within(popup).getByLabelText('Name');
    const key = within(popup).getByLabelText('Key');

    await userEvent.type(name, 'Documentation');
    expect(key).toHaveValue('DOC');

    await userEvent.clear(name);
    await userEvent.type(name, 'Mobile App Backend');
    expect(key).toHaveValue('MAB');
  });

  it('PRJ-1: stops following the name once the key is edited by hand', async () => {
    const { popup } = await openPopup();
    const name = within(popup).getByLabelText('Name');
    const key = within(popup).getByLabelText('Key');
    await userEvent.type(name, 'Website Redesign');
    expect(key).toHaveValue('WR');

    await userEvent.type(key, 'x');
    await userEvent.type(name, ' Team');

    expect(key).toHaveValue('WRX');
  });

  it("PRJ-1: shows the schema's messages under the fields and sends nothing", async () => {
    let requests = 0;
    server.use(
      http.post(PROJECTS_URL, () => {
        requests += 1;

        return HttpResponse.json(NEW_PROJECT, { status: 201 });
      }),
    );
    const { popup } = await openPopup();

    await submit(popup);

    const name = within(popup).getByLabelText('Name');
    await waitFor(() => {
      expect(name).toHaveAccessibleDescription('Name is required');
    });
    expect(name).toHaveFocus();
    expect(within(popup).getByLabelText('Key')).toHaveAccessibleDescription(
      "2–6 letters. Used in ticket keys like WEB-12. Can't be changed later Key is required",
    );

    await userEvent.type(within(popup).getByLabelText('Key'), 'W');
    expect(within(popup).getByLabelText('Key')).toHaveAccessibleDescription(
      "2–6 letters. Used in ticket keys like WEB-12. Can't be changed later Key must be 2–6 letters (A–Z)",
    );
    expect(requests).toBe(0);
  });

  it('PRJ-1: sends the cleaned form, then opens the new board and refreshes the project list', async () => {
    let sentBody: unknown;
    server.use(
      http.post(PROJECTS_URL, async ({ request }) => {
        sentBody = await request.json();

        return HttpResponse.json(NEW_PROJECT, { status: 201 });
      }),
    );
    // The board loads its project first (PRJ-6).
    mockProject({ ...NEW_PROJECT, ticketCount: 0 });
    const queryClient = createQueryClient();
    queryClient.setQueryData(PROJECTS_QUERY_KEY, []);
    const { popup, router } = await openPopup(queryClient);
    await userEvent.type(within(popup).getByLabelText('Name'), '  Website Redesign ');
    await userEvent.clear(within(popup).getByLabelText('Key'));
    await userEvent.type(within(popup).getByLabelText('Key'), 'web');

    await submit(popup);

    expect(await screen.findByRole('heading', { level: 1, name: 'WEB board' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/projects/WEB/board');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(sentBody).toEqual({ name: 'Website Redesign', key: 'WEB', description: null });
    expect(queryClient.getQueryState(PROJECTS_QUERY_KEY)?.isInvalidated).toBe(true);
  });

  it('PRJ-1: Create is disabled and says so while the project is being created', async () => {
    const { promise: serverCanAnswer, resolve: letServerAnswer } = Promise.withResolvers<void>();
    server.use(
      http.post(PROJECTS_URL, async () => {
        await serverCanAnswer;

        return HttpResponse.json(NEW_PROJECT, { status: 201 });
      }),
    );
    mockProject({ ...NEW_PROJECT, ticketCount: 0 });
    const { popup } = await fillValidForm();

    await submit(popup);

    expect(await within(popup).findByRole('button', { name: 'Creating…' })).toBeDisabled();

    letServerAnswer();

    expect(await screen.findByRole('heading', { level: 1, name: 'WEB board' })).toBeInTheDocument();
  });

  it('PRJ-1: 409 PROJECT_KEY_TAKEN shows the error under Key and keeps what was typed', async () => {
    respondWithError(409, {
      code: ErrorCode.PROJECT_KEY_TAKEN,
      message: PROJECT_KEY_TAKEN_MESSAGE,
      details: [{ field: 'key', message: PROJECT_KEY_TAKEN_MESSAGE }],
    });
    const { popup, router } = await fillValidForm();

    await submit(popup);

    const key = within(popup).getByLabelText('Key');
    await waitFor(() => {
      expect(key).toHaveAccessibleDescription(
        "2–6 letters. Used in ticket keys like WEB-12. Can't be changed later This key is already taken",
      );
    });
    expect(key).toHaveAttribute('aria-invalid', 'true');
    expect(key).toHaveFocus();
    expectTypedInputKept(popup);
    expect(within(popup).getByRole('button', { name: 'Create' })).toBeEnabled();
    expect(router.state.location.pathname).toBe('/projects');
  });

  it("PRJ-1: 400 VALIDATION_ERROR puts the server's details under their fields", async () => {
    respondWithError(400, {
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Description is too long',
      details: [{ field: 'description', message: 'Description must be at most 2000 characters' }],
    });
    const { popup } = await fillValidForm();

    await submit(popup);

    const description = within(popup).getByLabelText('Description (optional)');
    await waitFor(() => {
      expect(description).toHaveAccessibleDescription(
        'Description must be at most 2000 characters',
      );
    });
    expect(within(popup).queryByRole('alert')).not.toBeInTheDocument();
    expectTypedInputKept(popup);
  });

  it('PRJ-1: a 500 shows one alert and keeps what was typed', async () => {
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
    expect(within(popup).getByRole('button', { name: 'Create' })).toBeEnabled();
  });

  it('PRJ-1: Cancel closes the popup and returns focus to "Create project"', async () => {
    const { popup } = await openPopup();

    await userEvent.click(within(popup).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Create project' })).toHaveFocus();
  });
});
