import { Status } from '@mini-jira/shared';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/api/query-client';
import { PROJECTS_QUERY_KEY } from '@/api/query-keys';
import { mockProject } from '@/test/project';
import { renderRoute } from '@/test/render-route';
import { mockLoggedIn } from '@/test/session';
import {
  mockTicket,
  mockTicketErrorOnce,
  mockTicketNotFound,
  mockTicketOnHold,
  TEST_TICKET,
} from '@/test/tickets';

const TICKET_PATH = '/projects/WEB/tickets/WEB-12';

function openTicketPage(path: string = TICKET_PATH): void {
  mockLoggedIn();
  mockProject();
  renderRoute(path);
}

async function findTitle(): Promise<HTMLElement> {
  return screen.findByRole('heading', { level: 1, name: TEST_TICKET.title });
}

/** The value next to a label in the details panel ("Assigned to" → "Dana Levi"). */
function detailValue(label: string): Element | null {
  const panel = screen.getByRole('complementary', { name: 'Details' });

  return within(panel).getByText(label, { selector: 'dt' }).nextElementSibling;
}

describe('Ticket page', () => {
  it('TKT-2: shows the title, the description with its line breaks, and every detail', async () => {
    const requestedPaths = mockTicket();

    openTicketPage();

    expect(await findTitle()).toBeInTheDocument();
    expect(document.title).toBe(`WEB-12 ${TEST_TICKET.title} · Mini-Jira`);
    expect(screen.getByText('Bug · WEB-12')).toBeInTheDocument();
    const description = screen.getByRole('region', { name: 'Description' });
    expect(within(description).getByText(/Steps:/).textContent).toBe(TEST_TICKET.description);
    expect(detailValue('Status')).toHaveTextContent('In Progress');
    expect(detailValue('Assigned to')).toHaveTextContent('Dana Levi');
    expect(detailValue('Created by')).toHaveTextContent('Avi Ben');
    expect(detailValue('Priority')).toHaveTextContent('High');
    expect(detailValue('Type')).toHaveTextContent('Bug');
    expect(detailValue('Due date')).toHaveTextContent('Nov 30, 2026');
    expect(detailValue('Created')).toHaveTextContent('Nov 10, 2026');
    expect(detailValue('Updated')).toHaveTextContent('Nov 25, 2026');
    // The Estimate waits for the mentor's OK (DOC-5).
    expect(screen.queryByText('Estimate')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to board' })).toHaveAttribute(
      'href',
      '/projects/WEB/board',
    );
    expect(requestedPaths).toEqual(['/api/projects/WEB/tickets/WEB-12']);
  });

  it('TKT-2: says "Unassigned", "No description." and "None" when those are empty', async () => {
    mockTicket({ ...TEST_TICKET, assignee: null, description: null, dueDate: null });

    openTicketPage();

    await findTitle();
    expect(detailValue('Assigned to')).toHaveTextContent('Unassigned');
    expect(detailValue('Due date')).toHaveTextContent('None');
    expect(screen.getByText('No description.')).toBeInTheDocument();
  });

  it('TKT-2: a past due date says "Overdue"', async () => {
    mockTicket({ ...TEST_TICKET, dueDate: '2020-01-15' });

    openTicketPage();

    await findTitle();
    expect(detailValue('Due date')).toHaveTextContent('Jan 15, 2020 · Overdue');
  });

  it('TKT-2: a Done ticket past its due date is not overdue', async () => {
    mockTicket({ ...TEST_TICKET, dueDate: '2020-01-15', status: Status.DONE });

    openTicketPage();

    await findTitle();
    expect(detailValue('Due date')).toHaveTextContent('Jan 15, 2020');
    expect(detailValue('Due date')).not.toHaveTextContent('Overdue');
  });

  it('TKT-2: shows the loading state until the ticket arrives', async () => {
    const { answer } = mockTicketOnHold();

    openTicketPage();

    expect(await screen.findByText('Loading the ticket')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();

    answer();

    expect(await findTitle()).toBeInTheDocument();
  });

  it('TKT-2: a key that is not in this project shows "Ticket not found" with a way back to the board', async () => {
    mockTicketNotFound();

    openTicketPage('/projects/WEB/tickets/APP-3');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ticket not found' }),
    ).toBeInTheDocument();
    expect(document.title).toBe('Ticket not found · Mini-Jira');
    expect(screen.getByRole('link', { name: 'Back to board' })).toHaveAttribute(
      'href',
      '/projects/WEB/board',
    );
  });

  it('TKT-2: a server error shows an error with "Try again", which loads the ticket', async () => {
    const { requests } = mockTicketErrorOnce();
    mockLoggedIn();
    mockProject();
    // The app retries a 5xx three times with growing waits; the test checks the error state now.
    const queryClient = createQueryClient();
    queryClient.setQueryDefaults(PROJECTS_QUERY_KEY, { retry: false });

    renderRoute(TICKET_PATH, undefined, { queryClient });

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load this ticket.");

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await findTitle()).toBeInTheDocument();
    expect(requests()).toBe(2);
  });

  it('TKT-2: "Copy link" puts the full ticket URL on the clipboard and says so', async () => {
    const user = userEvent.setup();
    mockTicket();
    openTicketPage();

    await user.click(await screen.findByRole('button', { name: 'Copy link' }));

    expect(await navigator.clipboard.readText()).toBe(`${window.location.origin}${TICKET_PATH}`);
    // The page has more than one status message (TKT-3 adds "Changes saved"), so find it by text.
    expect(screen.getByText('Link copied')).toHaveAttribute('role', 'status');
  });

  it('TKT-2: says so when the browser refuses to copy', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Not allowed'));
    mockTicket();
    openTicketPage();

    await user.click(await screen.findByRole('button', { name: 'Copy link' }));

    expect(await screen.findByText("Couldn't copy the link")).toHaveAttribute('role', 'status');
  });
});
