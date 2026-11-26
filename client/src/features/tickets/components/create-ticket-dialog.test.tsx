import { ErrorCode, Role } from '@mini-jira/shared';
import type { ErrorResponse, Ticket } from '@mini-jira/shared';
import type { QueryClient } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { createQueryClient } from '@/api/query-client';
import { PROJECTS_QUERY_KEY, projectQueryKey } from '@/api/query-keys';
import { mockMembers } from '@/test/members';
import { mockProject, TEST_PROJECT } from '@/test/project';
import { renderRoute } from '@/test/render-route';
import { server } from '@/test/server';
import { mockLoggedIn, TEST_USER } from '@/test/session';

const TICKETS_URL = `/api/projects/${TEST_PROJECT.key}/tickets`;
const NEW_TICKET: Ticket = {
  id: '8c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  key: 'WEB-13',
  number: 13,
  title: 'Fix login redirect',
  description: 'After the session expires',
  type: 'BUG',
  priority: 'HIGH',
  status: 'TODO',
  reporter: { id: TEST_USER.id, name: TEST_USER.name },
  assignee: null,
  dueDate: null,
  createdAt: '2026-11-25T10:00:00.000Z',
  updatedAt: '2026-11-25T10:00:00.000Z',
};

function respondWithError(status: number, error: ErrorResponse['error']): void {
  server.use(http.post(TICKETS_URL, () => HttpResponse.json({ error }, { status })));
}

/** Records the bodies the API receives and answers 201 with the new ticket. */
function recordCreatedTickets(): unknown[] {
  const sentBodies: unknown[] = [];
  server.use(
    http.post(TICKETS_URL, async ({ request }) => {
      sentBodies.push(await request.json());

      return HttpResponse.json(NEW_TICKET, { status: 201 });
    }),
  );

  return sentBodies;
}

/** Opens the WEB board as a member (not the owner) and clicks "Create ticket". */
async function openPopup(queryClient: QueryClient = createQueryClient()): Promise<HTMLElement> {
  mockLoggedIn();
  mockProject({ ...TEST_PROJECT, role: Role.MEMBER });
  // The assignee picker lists the project's members (TKT-5).
  mockMembers();
  renderRoute(`/projects/${TEST_PROJECT.key}/board`, undefined, { queryClient });
  await userEvent.click(await screen.findByRole('button', { name: 'Create ticket' }));

  return screen.findByRole('dialog', { name: 'Create ticket in WEB' });
}

/** Fills in a form that passes the client-side checks. */
async function fillValidForm(popup: HTMLElement): Promise<void> {
  await userEvent.type(within(popup).getByLabelText('Title'), '  Fix login redirect ');
  await userEvent.type(
    within(popup).getByLabelText('Description (optional)'),
    'After the session expires',
  );
  await userEvent.selectOptions(within(popup).getByLabelText('Type'), 'Bug');
  await userEvent.selectOptions(within(popup).getByLabelText('Priority'), 'High');
}

async function submit(popup: HTMLElement): Promise<void> {
  await userEvent.click(within(popup).getByRole('button', { name: 'Create' }));
}

function expectTypedInputKept(popup: HTMLElement): void {
  expect(within(popup).getByLabelText('Title')).toHaveValue('  Fix login redirect ');
  expect(within(popup).getByLabelText('Description (optional)')).toHaveValue(
    'After the session expires',
  );
  expect(within(popup).getByLabelText('Type')).toHaveValue('BUG');
  expect(within(popup).getByLabelText('Priority')).toHaveValue('HIGH');
}

describe('CreateTicketDialog', () => {
  it('TKT-1: a member opens the popup with Task and Medium chosen and a title counter', async () => {
    const popup = await openPopup();
    const title = within(popup).getByLabelText('Title');

    expect(within(popup).getByLabelText('Type')).toHaveValue('TASK');
    expect(within(popup).getByLabelText('Priority')).toHaveValue('MEDIUM');
    expect(title).toHaveAccessibleDescription('0 / 120');

    await userEvent.type(title, 'Fix login');

    expect(title).toHaveAccessibleDescription('9 / 120');
  });

  it("TKT-1: shows the schema's messages under the fields and sends nothing", async () => {
    const sentBodies = recordCreatedTickets();
    const popup = await openPopup();
    const title = within(popup).getByLabelText('Title');

    await submit(popup);

    await waitFor(() => {
      expect(title).toHaveAccessibleDescription('0 / 120 Title is required');
    });
    expect(title).toHaveFocus();

    await userEvent.type(title, 'a'.repeat(121));

    expect(title).toHaveAccessibleDescription('121 / 120 Title must be at most 120 characters');
    expect(sentBodies).toEqual([]);
  });

  it('TKT-1: sends the cleaned form, closes the popup, says "WEB-13 created", and refreshes the tickets and counts', async () => {
    const sentBodies = recordCreatedTickets();
    const queryClient = createQueryClient();
    // Stand-ins for My Projects' counts (PRJ-2) and the project's ticket queries (BRD-1, LST-1).
    const projectTicketsKey = [...projectQueryKey(TEST_PROJECT.key), 'tickets'];
    queryClient.setQueryData([...PROJECTS_QUERY_KEY, 'list'], []);
    queryClient.setQueryData(projectTicketsKey, []);
    const popup = await openPopup(queryClient);
    await fillValidForm(popup);

    await submit(popup);

    expect(await screen.findByRole('status')).toHaveTextContent(/^WEB-13 created$/);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(queryClient.getQueryState([...PROJECTS_QUERY_KEY, 'list'])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(projectTicketsKey)?.isInvalidated).toBe(true);
    expect(sentBodies).toEqual([
      {
        title: 'Fix login redirect',
        description: 'After the session expires',
        type: 'BUG',
        priority: 'HIGH',
        dueDate: null,
        assigneeId: null,
      },
    ]);
    expect(screen.getByRole('button', { name: 'Create ticket' })).toHaveFocus();
  });

  it('TKT-1: the ✕ on the message hides it', async () => {
    recordCreatedTickets();
    const popup = await openPopup();
    await userEvent.type(within(popup).getByLabelText('Title'), 'Fix login redirect');
    await submit(popup);
    const message = await screen.findByRole('status');
    expect(message).toHaveTextContent('WEB-13 created');

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(message).toBeEmptyDOMElement();
    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
  });

  it('TKT-1: sends the picked due date as the same calendar day, and a cleared one as null', async () => {
    const sentBodies = recordCreatedTickets();
    const popup = await openPopup();
    await userEvent.type(within(popup).getByLabelText('Title'), 'Ship it');
    const dueDate = within(popup).getByLabelText('Due date (optional)');
    await userEvent.type(dueDate, '2026-12-01');

    await submit(popup);

    await waitFor(() => {
      expect(sentBodies).toHaveLength(1);
    });
    expect(sentBodies[0]).toMatchObject({ dueDate: '2026-12-01' });

    await userEvent.click(screen.getByRole('button', { name: 'Create ticket' }));
    const nextPopup = await screen.findByRole('dialog', { name: 'Create ticket in WEB' });
    await userEvent.type(within(nextPopup).getByLabelText('Title'), 'No date');
    const nextDueDate = within(nextPopup).getByLabelText('Due date (optional)');
    await userEvent.type(nextDueDate, '2026-12-01');
    await userEvent.clear(nextDueDate);

    await submit(nextPopup);

    await waitFor(() => {
      expect(sentBodies).toHaveLength(2);
    });
    expect(sentBodies[1]).toMatchObject({ dueDate: null });
  });

  it('TKT-1: Create is disabled and says so while the ticket is being created', async () => {
    const { promise: serverCanAnswer, resolve: letServerAnswer } = Promise.withResolvers<void>();
    server.use(
      http.post(TICKETS_URL, async () => {
        await serverCanAnswer;

        return HttpResponse.json(NEW_TICKET, { status: 201 });
      }),
    );
    const popup = await openPopup();
    await fillValidForm(popup);

    await submit(popup);

    expect(await within(popup).findByRole('button', { name: 'Creating…' })).toBeDisabled();

    letServerAnswer();

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it("TKT-1: 400 VALIDATION_ERROR puts the server's details under their fields and keeps the input", async () => {
    respondWithError(400, {
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Title is required',
      details: [{ field: 'title', message: "Title contains characters that aren't allowed" }],
    });
    const popup = await openPopup();
    await fillValidForm(popup);

    await submit(popup);

    const title = within(popup).getByLabelText('Title');
    await waitFor(() => {
      expect(title).toHaveAccessibleDescription(
        "21 / 120 Title contains characters that aren't allowed",
      );
    });
    expect(title).toHaveFocus();
    expect(within(popup).queryByRole('alert')).not.toBeInTheDocument();
    expectTypedInputKept(popup);
    expect(within(popup).getByRole('button', { name: 'Create' })).toBeEnabled();
  });

  it('TKT-1: a 500 shows one alert and keeps what was typed', async () => {
    respondWithError(500, {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Something went wrong. Please try again.',
    });
    const popup = await openPopup();
    await fillValidForm(popup);

    await submit(popup);

    expect(await within(popup).findByRole('alert')).toHaveTextContent(
      'Something went wrong. Please try again.',
    );
    expectTypedInputKept(popup);
  });
});
