import { ErrorCode } from '@mini-jira/shared';
import type { ProjectDetail } from '@mini-jira/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { createQueryClient } from '@/api/query-client';
import { PROJECTS_QUERY_KEY } from '@/api/query-keys';
import { mockMembers } from '@/test/members';
import { mockProject, TEST_PROJECT } from '@/test/project';
import { renderRoute } from '@/test/render-route';
import { server } from '@/test/server';
import { mockLoggedIn } from '@/test/session';

const PROJECT_URL = '/api/projects/WEB';

/** Opens the settings page of WEB as its owner and returns the Project details section. */
async function openDetails(queryClient = createQueryClient()): Promise<HTMLElement> {
  mockLoggedIn();
  mockProject({ ...TEST_PROJECT, description: 'New company website' });
  mockMembers();
  renderRoute('/projects/WEB/settings', undefined, { queryClient });

  return screen.findByRole('region', { name: 'Project details' });
}

function saveButton(details: HTMLElement): HTMLElement {
  return within(details).getByRole('button', { name: /Save changes|Saving…/ });
}

describe('Edit project details (PRJ-5)', () => {
  it('PRJ-5: the key is locked and Save changes is disabled until something changes', async () => {
    const details = await openDetails();

    expect(within(details).getByRole('group', { name: 'Key' })).toHaveTextContent(
      "WEB Can't be changed — it's part of every ticket key (WEB-12)",
    );
    expect(saveButton(details)).toBeDisabled();

    await userEvent.type(within(details).getByLabelText('Name'), '!');

    expect(saveButton(details)).toBeEnabled();
  });

  it('PRJ-5: saves the new name and cleared description, then shows it everywhere', async () => {
    const queryClient = createQueryClient();
    // My Projects as if the user had opened it before.
    queryClient.setQueryData([...PROJECTS_QUERY_KEY, 'list'], { pages: [], pageParams: [] });
    const details = await openDetails(queryClient);
    let sentBody: unknown;
    server.use(
      http.patch(PROJECT_URL, async ({ request }) => {
        sentBody = await request.json();
        await delay(50);
        const updated: ProjectDetail = {
          ...TEST_PROJECT,
          name: 'Website 2.0',
          description: null,
          updatedAt: '2026-11-25T09:00:00.000Z',
        };

        return HttpResponse.json(updated);
      }),
    );
    const name = within(details).getByLabelText('Name');

    await userEvent.clear(name);
    await userEvent.type(name, '  Website 2.0 ');
    await userEvent.clear(within(details).getByLabelText('Description'));
    await userEvent.click(saveButton(details));

    expect(saveButton(details)).toHaveTextContent('Saving…');
    expect(saveButton(details)).toBeDisabled();
    expect(await within(details).findByText('Project updated')).toHaveAttribute('role', 'status');
    expect(sentBody).toEqual({ name: 'Website 2.0', description: null });
    expect(screen.getByRole('heading', { level: 1, name: 'WEB Website 2.0' })).toBeInTheDocument();
    expect(name).toHaveValue('Website 2.0');
    expect(saveButton(details)).toBeDisabled();
    expect(queryClient.getQueryState([...PROJECTS_QUERY_KEY, 'list'])?.isInvalidated).toBe(true);
  });

  it('PRJ-5: an empty name shows the error under the field and sends nothing', async () => {
    const details = await openDetails();
    let requests = 0;
    server.use(
      http.patch(PROJECT_URL, () => {
        requests += 1;

        return HttpResponse.json(TEST_PROJECT);
      }),
    );
    const name = within(details).getByLabelText('Name');

    await userEvent.clear(name);
    await userEvent.click(saveButton(details));

    expect(name).toHaveAccessibleDescription('Name is required');
    expect(name).toHaveFocus();
    expect(requests).toBe(0);
  });

  it("PRJ-5: the server's field error goes under its field and the input is kept", async () => {
    const details = await openDetails();
    server.use(
      http.patch(PROJECT_URL, () =>
        HttpResponse.json(
          {
            error: {
              code: ErrorCode.VALIDATION_ERROR,
              message: 'Invalid input',
              details: [{ field: 'description', message: 'Description is too long' }],
            },
          },
          { status: 400 },
        ),
      ),
    );
    const description = within(details).getByLabelText('Description');

    await userEvent.type(description, ' and more');
    await userEvent.click(saveButton(details));

    await waitFor(() => {
      expect(description).toHaveAccessibleDescription('Description is too long');
    });
    expect(description).toHaveValue('New company website and more');
    expect(within(details).queryByText('Project updated')).not.toBeInTheDocument();
  });

  it('PRJ-5: a failure with no field shows an alert in the form', async () => {
    const details = await openDetails();
    server.use(
      http.patch(PROJECT_URL, () =>
        HttpResponse.json(
          { error: { code: ErrorCode.FORBIDDEN, message: 'Only the project owner can do this' } },
          { status: 403 },
        ),
      ),
    );

    await userEvent.type(within(details).getByLabelText('Name'), '!');
    await userEvent.click(saveButton(details));

    expect(await within(details).findByRole('alert')).toHaveTextContent(
      'Only the project owner can do this',
    );
    expect(within(details).getByLabelText('Name')).toHaveValue('Website Redesign!');
  });
});
