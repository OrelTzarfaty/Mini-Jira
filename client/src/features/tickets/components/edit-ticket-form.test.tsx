import { EDIT_CONFLICT_MESSAGE, ErrorCode, Priority, Status } from '@mini-jira/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { mockMembers } from '@/test/members';
import { mockProject } from '@/test/project';
import { renderRoute } from '@/test/render-route';
import { mockLoggedIn } from '@/test/session';
import { mockUpdateTicket, SAVED_UPDATED_AT, TEST_TICKET } from '@/test/tickets';

const TICKET_PATH = '/projects/WEB/tickets/WEB-12';

/** Opens the ticket page and clicks Edit. Returns the edit form. */
async function openEditMode(): Promise<HTMLElement> {
  mockLoggedIn();
  mockProject();
  // The assignee picker lists the project's members (TKT-5).
  mockMembers();
  renderRoute(TICKET_PATH);
  await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));

  return screen.getByRole('form', { name: 'Edit ticket' });
}

function detailValue(label: string): Element | null {
  const panel = screen.getByRole('complementary', { name: 'Details' });

  return within(panel).getByText(label, { selector: 'dt' }).nextElementSibling;
}

describe('Edit ticket (TKT-3)', () => {
  it('TKT-3: Edit shows every field with the ticket values and focuses the title; Cancel saves nothing', async () => {
    const { bodies } = mockUpdateTicket();

    const form = await openEditMode();

    const title = within(form).getByLabelText('Title');
    expect(title).toHaveValue(TEST_TICKET.title);
    expect(title).toHaveFocus();
    expect(title).toHaveAccessibleDescription(`${String(TEST_TICKET.title.length)} / 120`);
    expect(within(form).getByLabelText('Description (optional)')).toHaveValue(
      TEST_TICKET.description,
    );
    expect(within(form).getByLabelText('Status')).toHaveValue(Status.IN_PROGRESS);
    expect(within(form).getByLabelText('Priority')).toHaveValue(Priority.HIGH);
    expect(within(form).getByLabelText('Type')).toHaveValue(TEST_TICKET.type);
    expect(within(form).getByLabelText('Due date (optional)')).toHaveValue(TEST_TICKET.dueDate);
    expect(within(form).getByLabelText('Assigned to')).toHaveValue(TEST_TICKET.assignee?.id);
    // Not editable here: the estimate waits for DOC-5.
    expect(within(form).queryByLabelText(/Estimate/)).not.toBeInTheDocument();

    await userEvent.clear(title);
    await userEvent.type(title, 'Not saved');
    await userEvent.click(within(form).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('form', { name: 'Edit ticket' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: TEST_TICKET.title })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveFocus();
    expect(bodies).toEqual([]);
  });

  it('TKT-3: Save sends updatedAt and only the changed fields, then shows the saved ticket and "Changes saved"', async () => {
    const { bodies } = mockUpdateTicket();
    const form = await openEditMode();

    const title = within(form).getByLabelText('Title');
    await userEvent.clear(title);
    await userEvent.type(title, '  Fix the login redirect  ');
    await userEvent.selectOptions(within(form).getByLabelText('Priority'), Priority.CRITICAL);
    await userEvent.clear(within(form).getByLabelText('Due date (optional)'));
    await userEvent.click(within(form).getByRole('button', { name: 'Save changes' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Fix the login redirect' }),
    ).toBeInTheDocument();
    expect(bodies).toEqual([
      {
        updatedAt: TEST_TICKET.updatedAt,
        title: 'Fix the login redirect',
        priority: Priority.CRITICAL,
        dueDate: null,
      },
    ]);
    expect(detailValue('Priority')).toHaveTextContent('Critical');
    expect(detailValue('Due date')).toHaveTextContent('None');
    expect(detailValue('Updated')?.querySelector('time')).toHaveAttribute(
      'datetime',
      SAVED_UPDATED_AT,
    );
    // In a status message, so screen readers announce it.
    expect(screen.getByText('Changes saved').closest('[role="status"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveFocus();
  });

  it('TKT-3: Save with nothing changed sends nothing and goes back to view mode', async () => {
    const { bodies } = mockUpdateTicket();
    const form = await openEditMode();

    await userEvent.click(within(form).getByRole('button', { name: 'Save changes' }));

    expect(screen.queryByRole('form', { name: 'Edit ticket' })).not.toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it('TKT-3: an empty title shows "Title is required" under the field and sends nothing', async () => {
    const { bodies } = mockUpdateTicket();
    const form = await openEditMode();

    const title = within(form).getByLabelText('Title');
    await userEvent.clear(title);
    await userEvent.type(title, '   ');
    await userEvent.click(within(form).getByRole('button', { name: 'Save changes' }));

    expect(await within(form).findByText('Title is required')).toBeInTheDocument();
    expect(title).toHaveAccessibleDescription('3 / 120 Title is required');
    expect(title).toBeInvalid();
    expect(title).toHaveFocus();
    expect(bodies).toEqual([]);
  });

  it("TKT-3: the server's field error shows under its field and the typed input stays", async () => {
    mockUpdateTicket(TEST_TICKET, {
      error: {
        status: 400,
        body: {
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Invalid request',
            details: [{ field: 'dueDate', message: 'Due date is too far away' }],
          },
        },
      },
    });
    const form = await openEditMode();

    const title = within(form).getByLabelText('Title');
    await userEvent.clear(title);
    await userEvent.type(title, 'My new title');
    await userEvent.click(within(form).getByRole('button', { name: 'Save changes' }));

    const dueDate = within(form).getByLabelText('Due date (optional)');
    await waitFor(() => {
      expect(dueDate).toHaveAccessibleDescription('Due date is too far away');
    });
    expect(title).toHaveValue('My new title');
    expect(screen.getByRole('form', { name: 'Edit ticket' })).toBeInTheDocument();
  });

  it('TKT-3: Save changes is disabled and says "Saving…" while saving', async () => {
    const { answer } = mockUpdateTicket(TEST_TICKET, { hold: true });
    const form = await openEditMode();

    await userEvent.selectOptions(within(form).getByLabelText('Status'), Status.DONE);
    await userEvent.click(within(form).getByRole('button', { name: 'Save changes' }));

    expect(await within(form).findByRole('button', { name: 'Saving…' })).toBeDisabled();

    answer();

    expect(await screen.findByText('Changes saved')).toBeInTheDocument();
    expect(detailValue('Status')).toHaveTextContent('Done');
  });

  it('TKT-3, CON-1: a 409 says someone else updated the ticket and keeps the form and the input', async () => {
    mockUpdateTicket(TEST_TICKET, {
      error: {
        status: 409,
        body: { error: { code: ErrorCode.EDIT_CONFLICT, message: EDIT_CONFLICT_MESSAGE } },
      },
    });
    const form = await openEditMode();

    const description = within(form).getByLabelText('Description (optional)');
    await userEvent.clear(description);
    await userEvent.type(description, 'My careful rewrite');
    await userEvent.click(within(form).getByRole('button', { name: 'Save changes' }));

    expect(await within(form).findByRole('alert')).toHaveTextContent(
      /This ticket was updated by someone else while you were editing\. Your changes have not been saved/,
    );
    expect(description).toHaveValue('My careful rewrite');
    expect(within(form).getByRole('button', { name: 'Save changes' })).toBeEnabled();
  });
});
