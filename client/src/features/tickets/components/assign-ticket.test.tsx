import {
  ASSIGNEE_NOT_MEMBER_MESSAGE,
  EDIT_CONFLICT_MESSAGE,
  ErrorCode,
  Role,
  updateTicketSchema,
} from '@mini-jira/shared';
import type { Ticket } from '@mini-jira/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { manyMembers, mockMembers, OTHER_MEMBER, TEST_MEMBERS } from '@/test/members';
import { mockProject, TEST_PROJECT } from '@/test/project';
import { renderRoute } from '@/test/render-route';
import { server } from '@/test/server';
import { mockLoggedIn, TEST_USER } from '@/test/session';
import { mockUpdateTicket, SAVED_UPDATED_AT, TEST_TICKET } from '@/test/tickets';

const TICKETS_URL = `/api/projects/${TEST_PROJECT.key}/tickets`;
const TICKET_URL = `${TICKETS_URL}/${TEST_TICKET.key}`;
const TICKET_PATH = `/projects/${TEST_PROJECT.key}/tickets/${TEST_TICKET.key}`;
// TEST_USER (Dana Levi) is the logged-in user; Noa is another member.
const NOA = OTHER_MEMBER;
const UNASSIGNED_TICKET: Ticket = { ...TEST_TICKET, assignee: null };
const NOAS_TICKET: Ticket = { ...TEST_TICKET, assignee: { id: NOA.userId, name: NOA.name } };

/** The names in a select, in order. */
function optionNames(select: HTMLElement): string[] {
  return within(select)
    .getAllByRole('option')
    .map((option) => option.textContent);
}

/** Records the bodies the API receives and answers 201 with a new ticket. */
function recordCreatedTickets(): unknown[] {
  const bodies: unknown[] = [];
  server.use(
    http.post(TICKETS_URL, async ({ request }) => {
      bodies.push(await request.json());

      return HttpResponse.json({ ...UNASSIGNED_TICKET, key: 'WEB-13' }, { status: 201 });
    }),
  );

  return bodies;
}

/** Opens the WEB board as a member and the Create ticket popup, with its title filled in. */
async function openCreatePopup(): Promise<HTMLElement> {
  mockLoggedIn();
  mockProject({ ...TEST_PROJECT, role: Role.MEMBER });
  renderRoute(`/projects/${TEST_PROJECT.key}/board`);
  await userEvent.click(await screen.findByRole('button', { name: 'Create ticket' }));
  const popup = await screen.findByRole('dialog', { name: 'Create ticket in WEB' });
  await userEvent.type(within(popup).getByLabelText('Title'), 'Fix login redirect');

  return popup;
}

/** The assignee picker once the members have arrived. */
async function loadedPicker(container: HTMLElement, label: string): Promise<HTMLElement> {
  const picker = within(container).getByLabelText(label);
  await waitFor(() => {
    expect(picker).toBeEnabled();
  });

  return picker;
}

function openTicketPage(): void {
  mockLoggedIn();
  mockProject();
  mockMembers();
  renderRoute(TICKET_PATH);
}

async function openEditMode(): Promise<HTMLElement> {
  openTicketPage();
  await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));

  return screen.getByRole('form', { name: 'Edit ticket' });
}

function assignedTo(): Element | null {
  const panel = screen.getByRole('complementary', { name: 'Details' });

  return within(panel).getByText('Assigned to', { selector: 'dt' }).nextElementSibling;
}

describe('Assignee picker in the Create ticket popup (TKT-5)', () => {
  it('TKT-5: starts at "Unassigned", lists the members by name, and sends the one picked', async () => {
    mockMembers();
    const bodies = recordCreatedTickets();
    const popup = await openCreatePopup();

    const picker = await loadedPicker(popup, 'Assignee');
    expect(picker).toHaveValue('');
    expect(optionNames(picker)).toEqual(['Unassigned', 'Dana Levi', 'Noa Katz']);

    await userEvent.selectOptions(picker, 'Noa Katz');
    await userEvent.click(within(popup).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(bodies).toEqual([expect.objectContaining({ assigneeId: NOA.userId })]);
    });
  });

  it('TKT-5: "Assign to me" picks the logged-in user, goes away, and leaves focus on the picker', async () => {
    mockMembers();
    const bodies = recordCreatedTickets();
    const popup = await openCreatePopup();
    const picker = await loadedPicker(popup, 'Assignee');

    await userEvent.click(within(popup).getByRole('button', { name: 'Assign to me' }));

    expect(picker).toHaveValue(TEST_USER.id);
    expect(picker).toHaveFocus();
    expect(within(popup).queryByRole('button', { name: 'Assign to me' })).not.toBeInTheDocument();

    await userEvent.click(within(popup).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(bodies).toEqual([expect.objectContaining({ assigneeId: TEST_USER.id })]);
    });
  });

  it('TKT-5: a 400 on assigneeId shows under the picker and keeps the input', async () => {
    mockMembers();
    server.use(
      http.post(TICKETS_URL, () =>
        HttpResponse.json(
          {
            error: {
              code: ErrorCode.VALIDATION_ERROR,
              message: 'Invalid request',
              details: [{ field: 'assigneeId', message: ASSIGNEE_NOT_MEMBER_MESSAGE }],
            },
          },
          { status: 400 },
        ),
      ),
    );
    const popup = await openCreatePopup();
    const picker = await loadedPicker(popup, 'Assignee');
    await userEvent.selectOptions(picker, 'Noa Katz');

    await userEvent.click(within(popup).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(picker).toHaveAccessibleDescription(ASSIGNEE_NOT_MEMBER_MESSAGE);
    });
    expect(picker).toBeInvalid();
    expect(picker).toHaveValue(NOA.userId);
    expect(within(popup).getByLabelText('Title')).toHaveValue('Fix login redirect');
  });

  it('TKT-5: with more than 20 members it loads every page and lists them all', async () => {
    const members = manyMembers(45);
    const requestedPages = mockMembers(members);
    const popup = await openCreatePopup();

    const picker = await loadedPicker(popup, 'Assignee');

    expect(optionNames(picker)).toHaveLength(members.length + 1);
    expect(within(picker).getByRole('option', { name: 'Member 43' })).toBeInTheDocument();
    expect(requestedPages.toSorted()).toEqual([1, 2, 3]);
  });

  it('TKT-5: says when the members are loading and when they failed, and "Try again" loads them', async () => {
    let requests = 0;
    const { promise, resolve } = Promise.withResolvers<undefined>();
    server.use(
      http.get('/api/projects/:projectKey/members', async () => {
        requests += 1;
        await promise;

        // A 4xx, so the query client shows the error at once instead of retrying.
        return requests === 1
          ? HttpResponse.json(
              { error: { code: ErrorCode.NOT_FOUND, message: 'Project not found' } },
              { status: 404 },
            )
          : HttpResponse.json({
              items: TEST_MEMBERS,
              page: 1,
              pageSize: 20,
              total: 2,
              totalPages: 1,
            });
      }),
    );
    const popup = await openCreatePopup();
    const picker = within(popup).getByLabelText('Assignee');

    expect(picker).toBeDisabled();
    expect(picker).toHaveAccessibleDescription('Loading members…');
    expect(within(popup).getByRole('button', { name: 'Assign to me' })).toBeDisabled();

    resolve(undefined);

    await waitFor(() => {
      expect(picker).toHaveAccessibleDescription("Couldn't load the members.");
    });
    // The choices it knows without the list still work.
    expect(picker).toBeEnabled();
    expect(optionNames(picker)).toEqual(['Unassigned', 'Dana Levi']);

    await userEvent.click(within(popup).getByRole('button', { name: 'Try again' }));

    await waitFor(() => {
      expect(optionNames(picker)).toEqual(['Unassigned', 'Dana Levi', 'Noa Katz']);
    });
    expect(picker).not.toHaveAccessibleDescription();
  });
});

describe('Assignee picker in edit mode (TKT-5)', () => {
  it('TKT-5: shows the assignee; picking another member sends only updatedAt and assigneeId', async () => {
    const { bodies } = mockUpdateTicket();
    const form = await openEditMode();
    const picker = await loadedPicker(form, 'Assigned to');

    expect(picker).toHaveValue(TEST_USER.id);
    // Already the assignee, so there's nothing for the shortcut to do.
    expect(within(form).queryByRole('button', { name: 'Assign to me' })).not.toBeInTheDocument();

    await userEvent.selectOptions(picker, 'Noa Katz');
    await userEvent.click(within(form).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Changes saved')).toBeInTheDocument();
    expect(bodies).toEqual([{ updatedAt: TEST_TICKET.updatedAt, assigneeId: NOA.userId }]);
    expect(assignedTo()).toHaveTextContent('Noa Katz');
  });

  it('TKT-5: picking "Unassigned" sends null and the details say "Unassigned"', async () => {
    const { bodies } = mockUpdateTicket();
    const form = await openEditMode();

    await userEvent.selectOptions(await loadedPicker(form, 'Assigned to'), 'Unassigned');
    await userEvent.click(within(form).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Changes saved')).toBeInTheDocument();
    expect(bodies).toEqual([{ updatedAt: TEST_TICKET.updatedAt, assigneeId: null }]);
    expect(assignedTo()).toHaveTextContent('Unassigned');
  });

  it('TKT-5: "Assign to me" picks the logged-in user in place of the assignee', async () => {
    const { bodies } = mockUpdateTicket(NOAS_TICKET);
    const form = await openEditMode();
    const picker = await loadedPicker(form, 'Assigned to');
    expect(picker).toHaveValue(NOA.userId);

    await userEvent.click(within(form).getByRole('button', { name: 'Assign to me' }));
    await userEvent.click(within(form).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Changes saved')).toBeInTheDocument();
    expect(bodies).toEqual([{ updatedAt: TEST_TICKET.updatedAt, assigneeId: TEST_USER.id }]);
  });

  it("TKT-5: the server's assigneeId error shows under the picker and the form stays open", async () => {
    mockUpdateTicket(TEST_TICKET, {
      error: {
        status: 400,
        body: {
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Invalid request',
            details: [{ field: 'assigneeId', message: ASSIGNEE_NOT_MEMBER_MESSAGE }],
          },
        },
      },
    });
    const form = await openEditMode();
    const picker = await loadedPicker(form, 'Assigned to');

    await userEvent.selectOptions(picker, 'Noa Katz');
    await userEvent.click(within(form).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(picker).toHaveAccessibleDescription(ASSIGNEE_NOT_MEMBER_MESSAGE);
    });
    expect(picker).toHaveValue(NOA.userId);
    expect(screen.getByRole('form', { name: 'Edit ticket' })).toBeInTheDocument();
  });
});

describe('"Assign to me" on the ticket page (TKT-5)', () => {
  it('TKT-5: saves the logged-in user as the assignee, says so, and moves focus to Edit', async () => {
    const { bodies, answer } = mockUpdateTicket(UNASSIGNED_TICKET, { hold: true });
    openTicketPage();
    await screen.findByRole('heading', { level: 1, name: TEST_TICKET.title });
    expect(assignedTo()).toHaveTextContent('Unassigned');

    await userEvent.click(screen.getByRole('button', { name: 'Assign to me' }));

    expect(await screen.findByRole('button', { name: 'Assigning…' })).toBeDisabled();

    answer();

    expect(await screen.findByText('Assigned to you')).toBeInTheDocument();
    expect(bodies).toEqual([{ updatedAt: TEST_TICKET.updatedAt, assigneeId: TEST_USER.id }]);
    expect(assignedTo()).toHaveTextContent('Dana Levi');
    expect(screen.queryByRole('button', { name: /Assign/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveFocus();
  });

  it("TKT-5: shows on another member's ticket", async () => {
    mockUpdateTicket(NOAS_TICKET);
    openTicketPage();

    expect(await screen.findByRole('button', { name: 'Assign to me' })).toBeInTheDocument();
    expect(assignedTo()).toHaveTextContent('Noa Katz');
  });

  it('TKT-5: is not shown when the logged-in user is the assignee already', async () => {
    mockUpdateTicket(TEST_TICKET);
    openTicketPage();

    await screen.findByRole('heading', { level: 1, name: TEST_TICKET.title });
    expect(screen.queryByRole('button', { name: 'Assign to me' })).not.toBeInTheDocument();
  });

  it('TKT-5, CON-1: a 409 says someone else updated the ticket; "Reload ticket" loads it and the next try works', async () => {
    const newerTicket: Ticket = {
      ...UNASSIGNED_TICKET,
      title: 'Renamed by Noa',
      updatedAt: SAVED_UPDATED_AT,
    };
    let current = UNASSIGNED_TICKET;
    const sentUpdatedAts: unknown[] = [];
    server.use(
      http.get(TICKET_URL, () => HttpResponse.json(current)),
      http.patch(TICKET_URL, async ({ request }) => {
        const body = updateTicketSchema.parse(await request.json());
        sentUpdatedAts.push(body.updatedAt);

        if (body.updatedAt !== newerTicket.updatedAt) {
          // Noa saved first.
          current = newerTicket;

          return HttpResponse.json(
            { error: { code: ErrorCode.EDIT_CONFLICT, message: EDIT_CONFLICT_MESSAGE } },
            { status: 409 },
          );
        }

        return HttpResponse.json({
          ...newerTicket,
          assignee: { id: TEST_USER.id, name: TEST_USER.name },
        });
      }),
    );
    mockLoggedIn();
    mockProject();
    renderRoute(TICKET_PATH);

    await userEvent.click(await screen.findByRole('button', { name: 'Assign to me' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      `${EDIT_CONFLICT_MESSAGE}. Reload it to see the changes, then try again.`,
    );
    expect(assignedTo()).toHaveTextContent('Unassigned');

    await userEvent.click(screen.getByRole('button', { name: 'Reload ticket' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Renamed by Noa' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Assign to me' }));

    expect(await screen.findByText('Assigned to you')).toBeInTheDocument();
    expect(sentUpdatedAts).toEqual([TEST_TICKET.updatedAt, SAVED_UPDATED_AT]);
  });

  it('TKT-5: another error shows its message and keeps the button', async () => {
    mockUpdateTicket(UNASSIGNED_TICKET, {
      error: {
        status: 500,
        body: { error: { code: ErrorCode.INTERNAL_ERROR, message: 'Something went wrong' } },
      },
    });
    openTicketPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Assign to me' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('button', { name: 'Assign to me' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Reload ticket' })).not.toBeInTheDocument();
  });
});
