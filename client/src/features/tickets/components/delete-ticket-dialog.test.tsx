import {
  ErrorCode,
  Role,
  TICKET_DELETE_FORBIDDEN_MESSAGE,
  TICKET_NOT_FOUND_MESSAGE,
} from '@mini-jira/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { mockProject, TEST_PROJECT } from '@/test/project';
import { renderRoute } from '@/test/render-route';
import { server } from '@/test/server';
import { mockLoggedIn, TEST_USER } from '@/test/session';
import { findTicketMessage, mockTicket, TEST_TICKET } from '@/test/tickets';

const TICKET_PATH = '/projects/WEB/tickets/WEB-12';
const TICKET_URL = '/api/projects/WEB/tickets/WEB-12';

/** TEST_TICKET was reported by Avi Ben, not by TEST_USER (Dana Levi). */
const REPORTED_BY_ME = { ...TEST_TICKET, reporter: { id: TEST_USER.id, name: TEST_USER.name } };
const AS_MEMBER = { ...TEST_PROJECT, role: Role.MEMBER };

/** Opens WEB-12 as TEST_USER, by default as the project owner of a ticket someone else reported. */
async function openTicketPage({ ticket = TEST_TICKET, project = TEST_PROJECT } = {}): Promise<
  ReturnType<typeof renderRoute>
> {
  mockLoggedIn();
  mockProject(project);
  mockTicket(ticket);
  const router = renderRoute(TICKET_PATH);
  await screen.findByRole('heading', { level: 1, name: ticket.title });

  return router;
}

async function openDeleteDialog(): Promise<HTMLElement> {
  await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

  return screen.findByRole('alertdialog');
}

function confirmButton(dialog: HTMLElement): HTMLElement {
  return within(dialog).getByRole('button', { name: /^(Delete|Deleting…)$/ });
}

/** Makes DELETE on the ticket answer with `status`; returns how many times it was called. */
function mockDeleteTicket(answer: () => Promise<Response> | Response): { calls: () => number } {
  let calls = 0;
  server.use(
    http.delete(TICKET_URL, () => {
      calls += 1;

      return answer();
    }),
  );

  return { calls: () => calls };
}

function errorResponse(status: number, code: ErrorCode, message: string): Response {
  return HttpResponse.json({ error: { code, message } }, { status });
}

describe('Delete a ticket (TKT-4)', () => {
  it('TKT-4: the reporter sees Delete', async () => {
    await openTicketPage({ ticket: REPORTED_BY_ME, project: AS_MEMBER });

    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('TKT-4: the project owner sees Delete on a ticket someone else reported', async () => {
    await openTicketPage();

    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('TKT-4: a member who is not the reporter does not see Delete', async () => {
    await openTicketPage({ project: AS_MEMBER });

    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('TKT-4: Delete is hidden in edit mode, like Edit, and comes back after Cancel', async () => {
    await openTicketPage();

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('TKT-4: the dialog names the ticket and focuses Cancel first', async () => {
    await openTicketPage();

    const dialog = await openDeleteDialog();

    expect(dialog).toHaveAccessibleName('Delete WEB-12?');
    expect(dialog).toHaveAccessibleDescription(
      "This also deletes its comments and history. This can't be undone.",
    );
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('TKT-4: confirming deletes the ticket, opens the board, and says "WEB-12 deleted"', async () => {
    const router = await openTicketPage();
    const deleteRequest = mockDeleteTicket(async () => {
      await delay(50);

      return new HttpResponse(null, { status: 204 });
    });
    const dialog = await openDeleteDialog();

    await userEvent.click(confirmButton(dialog));

    expect(confirmButton(dialog)).toHaveTextContent('Deleting…');
    expect(confirmButton(dialog)).toBeDisabled();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/projects/WEB/board');
    });
    expect(await findTicketMessage('WEB-12 deleted')).toBeInTheDocument();
    expect(deleteRequest.calls()).toBe(1);
    // Cleared from the history entry, so a reload or Back doesn't say it again.
    await waitFor(() => {
      expect(router.state.location.state).toBeNull();
    });
  });

  it('TKT-4: Cancel closes the dialog without deleting', async () => {
    const router = await openTicketPage();
    const deleteRequest = mockDeleteTicket(() => new HttpResponse(null, { status: 204 }));
    const dialog = await openDeleteDialog();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
    expect(deleteRequest.calls()).toBe(0);
    expect(router.state.location.pathname).toBe(TICKET_PATH);
  });

  it('TKT-4: a refused delete (403) keeps the dialog open with the reason', async () => {
    const router = await openTicketPage();
    mockDeleteTicket(() =>
      errorResponse(403, ErrorCode.FORBIDDEN, TICKET_DELETE_FORBIDDEN_MESSAGE),
    );
    const dialog = await openDeleteDialog();

    await userEvent.click(confirmButton(dialog));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      TICKET_DELETE_FORBIDDEN_MESSAGE,
    );
    expect(confirmButton(dialog)).toBeEnabled();
    expect(router.state.location.pathname).toBe(TICKET_PATH);
  });

  it('TKT-4: a ticket someone else already deleted (404) counts as deleted', async () => {
    const router = await openTicketPage();
    mockDeleteTicket(() => errorResponse(404, ErrorCode.NOT_FOUND, TICKET_NOT_FOUND_MESSAGE));
    const dialog = await openDeleteDialog();

    await userEvent.click(confirmButton(dialog));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/projects/WEB/board');
    });
    expect(await findTicketMessage('WEB-12 deleted')).toBeInTheDocument();
  });
});
