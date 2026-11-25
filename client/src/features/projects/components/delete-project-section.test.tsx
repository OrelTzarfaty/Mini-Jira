import { ErrorCode } from '@mini-jira/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { mockMembers } from '@/test/members';
import { buildProjectListItem, mockMyProjects, mockProject, TEST_PROJECT } from '@/test/project';
import { renderRoute } from '@/test/render-route';
import { server } from '@/test/server';
import { mockLoggedIn } from '@/test/session';

const PROJECT_URL = '/api/projects/WEB';

/** Opens WEB's settings as its owner, with `ticketCount` tickets, and opens the delete dialog. */
async function openDeleteDialog(ticketCount = 48): Promise<{
  dialog: HTMLElement;
  router: ReturnType<typeof renderRoute>;
}> {
  mockLoggedIn();
  mockProject({ ...TEST_PROJECT, ticketCount });
  mockMembers();
  const router = renderRoute('/projects/WEB/settings');
  const dangerZone = await screen.findByRole('region', { name: 'Danger zone' });

  await userEvent.click(within(dangerZone).getByRole('button', { name: 'Delete project' }));

  return { dialog: await screen.findByRole('alertdialog'), router };
}

function deleteButton(dialog: HTMLElement): HTMLElement {
  return within(dialog).getByRole('button', { name: /Delete project|Deleting…/ });
}

describe('Delete a project (PRJ-5)', () => {
  it('PRJ-5: the dialog names the project and its ticket count', async () => {
    const { dialog } = await openDeleteDialog(48);

    expect(dialog).toHaveAccessibleName('Delete project WEB?');
    expect(dialog).toHaveAccessibleDescription(
      "This permanently deletes the project, its 48 tickets, and all comments and history. This can't be undone.",
    );
    // An alert dialog focuses Cancel first, so Enter never deletes by accident.
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it.each([
    [1, 'its 1 ticket,'],
    [0, 'its 0 tickets,'],
  ])('PRJ-5: %i tickets reads "%s"', async (ticketCount, text) => {
    const { dialog } = await openDeleteDialog(ticketCount);

    expect(dialog).toHaveAccessibleDescription(expect.stringContaining(text) as string);
  });

  it('PRJ-5: Delete project stays disabled until the key is typed exactly', async () => {
    const { dialog } = await openDeleteDialog();
    const field = within(dialog).getByLabelText('Type WEB to confirm');

    expect(deleteButton(dialog)).toBeDisabled();

    await userEvent.type(field, 'web');
    expect(deleteButton(dialog)).toBeDisabled();

    await userEvent.clear(field);
    await userEvent.type(field, 'WE');
    expect(deleteButton(dialog)).toBeDisabled();

    await userEvent.type(field, 'B');
    expect(deleteButton(dialog)).toBeEnabled();
  });

  it('PRJ-5: deletes, opens My Projects without the project, and says it was deleted', async () => {
    const { dialog, router } = await openDeleteDialog();
    const other = buildProjectListItem({
      id: '5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b',
      key: 'API',
      name: 'Public API',
    });
    mockMyProjects([other]);
    const projectRequests: string[] = [];
    server.use(
      http.delete(PROJECT_URL, async ({ request }) => {
        projectRequests.push(request.method);
        await delay(50);

        return new HttpResponse(null, { status: 204 });
      }),
      // Recorded and passed on: after the delete, nothing may ask for the project again.
      http.get(PROJECT_URL, ({ request }) => {
        projectRequests.push(request.method);
      }),
    );

    await userEvent.type(within(dialog).getByLabelText('Type WEB to confirm'), 'WEB');
    await userEvent.click(deleteButton(dialog));

    expect(deleteButton(dialog)).toHaveTextContent('Deleting…');
    const message = await screen.findByText('Project WEB deleted');
    expect(message).toHaveAttribute('role', 'status');
    expect(message).toHaveFocus();
    expect(router.state.location.pathname).toBe('/projects');
    expect(await screen.findByRole('link', { name: /Public API/ })).toBeInTheDocument();
    expect(screen.queryByText('Website Redesign')).not.toBeInTheDocument();
    expect(projectRequests).toEqual(['DELETE']);
    // Cleared from the history entry, so a reload doesn't say it again.
    await waitFor(() => {
      expect(router.state.location.state).toBeNull();
    });
    expect(screen.getByText('Project WEB deleted')).toBeInTheDocument();
  });

  it('PRJ-5: a failed delete keeps the dialog open with the error and the typed key', async () => {
    const { dialog, router } = await openDeleteDialog();
    server.use(
      http.delete(PROJECT_URL, () =>
        HttpResponse.json(
          { error: { code: ErrorCode.INTERNAL_ERROR, message: 'Something went wrong' } },
          { status: 500 },
        ),
      ),
    );
    const field = within(dialog).getByLabelText('Type WEB to confirm');

    await userEvent.type(field, 'WEB');
    await userEvent.click(deleteButton(dialog));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Something went wrong');
    expect(field).toHaveValue('WEB');
    expect(deleteButton(dialog)).toBeEnabled();
    expect(router.state.location.pathname).toBe('/projects/WEB/settings');
  });

  it('PRJ-5: Cancel closes the dialog, and opening it again starts empty', async () => {
    const { dialog } = await openDeleteDialog();

    await userEvent.type(within(dialog).getByLabelText('Type WEB to confirm'), 'WE');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
    const openButton = screen.getByRole('button', { name: 'Delete project' });
    expect(openButton).toHaveFocus();

    await userEvent.click(openButton);

    expect(
      within(await screen.findByRole('alertdialog')).getByLabelText('Type WEB to confirm'),
    ).toHaveValue('');
  });
});
