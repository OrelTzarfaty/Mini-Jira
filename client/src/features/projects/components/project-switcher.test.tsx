import { Role } from '@mini-jira/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  buildProjectListItem,
  buildProjectListItems,
  mockMyProjects,
  mockProject,
  TEST_PROJECT,
} from '@/test/project';
import { renderRoute } from '@/test/render-route';
import { server } from '@/test/server';
import { mockLoggedIn } from '@/test/session';

const CURRENT_PROJECT = buildProjectListItem();
const OTHER_PROJECT = buildProjectListItem({
  id: '7c1e2d3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  key: 'MOB',
  name: 'Mobile App',
  role: Role.MEMBER,
});

function getMainNavigation(): HTMLElement {
  return screen.getByRole('navigation', { name: 'Main' });
}

/** Opens `path` as a logged-in user and opens the project dropdown. */
async function openSwitcher(path: string, triggerName: string | RegExp = 'Projects') {
  mockLoggedIn();
  const router = renderRoute(path);
  const trigger = await within(await screen.findByRole('navigation', { name: 'Main' })).findByRole(
    'button',
    { name: triggerName },
  );
  await userEvent.click(trigger);
  const panel = screen.getByRole('dialog', { name: 'Switch project' });

  return { router, trigger, panel };
}

describe('ProjectSwitcher', () => {
  it('PRJ-2: shows "Projects" outside a project and "KEY · Name" inside one', async () => {
    mockMyProjects([CURRENT_PROJECT]);
    mockProject();
    mockLoggedIn();
    renderRoute('/projects/WEB/board');
    await screen.findByRole('banner');

    expect(
      await within(getMainNavigation()).findByRole('button', {
        name: 'Project WEB Website Redesign',
      }),
    ).toHaveTextContent('WEB ·Website Redesign');
  });

  it('PRJ-2: lists my projects with their role, the current one first and marked ✓', async () => {
    mockMyProjects([OTHER_PROJECT, CURRENT_PROJECT]);
    mockProject();
    const { panel } = await openSwitcher('/projects/WEB/board', /^Project WEB/);

    const options = await within(panel).findAllByRole('option');

    expect(options.map((option) => option.textContent)).toEqual([
      'WEB Website Redesign (current project) Owner',
      'MOB Mobile App Member',
      'View all projects →',
      'Create project',
    ]);
  });

  it('PRJ-2: shows at most 8 projects; the search finds the rest', async () => {
    const requests = mockMyProjects(buildProjectListItems(12));
    const { panel } = await openSwitcher('/my-work');

    await within(panel).findByRole('option', { name: /Project 1 / });
    expect(within(panel).getByRole('group', { name: 'Your projects' }).children).toHaveLength(8);

    await userEvent.type(within(panel).getByRole('combobox', { name: 'Search projects' }), '12');

    expect(await within(panel).findByRole('option', { name: /Project 12/ })).toBeInTheDocument();
    expect(within(panel).queryByRole('option', { name: /Project 1 / })).not.toBeInTheDocument();
    // Debounced: one request for the whole word, not one per key press.
    expect(requests.map((url) => url.search)).toEqual(['?page=1', '?page=1&q=12']);
  });

  it('PRJ-2: a search without matches says so', async () => {
    mockMyProjects([CURRENT_PROJECT]);
    const { panel } = await openSwitcher('/projects');
    await within(panel).findByRole('option', { name: /Website Redesign/ });

    await userEvent.type(within(panel).getByRole('combobox'), 'zzz');

    expect(await within(panel).findByText('No projects match your search.')).toBeInTheDocument();
    expect(within(panel).getByRole('option', { name: 'Create project' })).toBeInTheDocument();
  });

  it('PRJ-2: clicking a project opens its board and closes the dropdown', async () => {
    mockMyProjects([CURRENT_PROJECT, OTHER_PROJECT]);
    const { panel, router, trigger } = await openSwitcher('/projects');

    await userEvent.click(await within(panel).findByRole('option', { name: /Mobile App/ }));

    expect(router.state.location.pathname).toBe('/projects/MOB/board');
    expect(screen.queryByRole('dialog', { name: 'Switch project' })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });

  it('PRJ-2: keyboard: ↓ and ↑ move the highlight, Enter opens the project, on the same tab', async () => {
    mockMyProjects([CURRENT_PROJECT, OTHER_PROJECT]);
    mockProject();
    const { panel, router } = await openSwitcher('/projects/WEB/list', /^Project WEB/);
    const search = within(panel).getByRole('combobox', { name: 'Search projects' });
    await within(panel).findByRole('option', { name: /Mobile App/ });
    expect(search).toHaveFocus();

    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}');
    expect(within(panel).getByRole('option', { name: /Mobile App/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(search).toHaveAttribute(
      'aria-activedescendant',
      within(panel).getByRole('option', { name: /Mobile App/ }).id,
    );
    await userEvent.keyboard('{Enter}');

    expect(router.state.location.pathname).toBe('/projects/MOB/list');
  });

  it('PRJ-2: ↑ from the first option wraps to "Create project", and Enter opens its popup', async () => {
    mockMyProjects([CURRENT_PROJECT]);
    await openSwitcher('/projects');
    await screen.findByRole('option', { name: /Website Redesign/ });

    await userEvent.keyboard('{ArrowUp}{Enter}');

    expect(await screen.findByRole('dialog', { name: 'Create project' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Switch project' })).not.toBeInTheDocument();
  });

  it('PRJ-2: Esc closes the dropdown and returns focus to its button', async () => {
    mockMyProjects([CURRENT_PROJECT]);
    const { trigger } = await openSwitcher('/projects');

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Switch project' })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });

  it('PRJ-2: "View all projects" opens My Projects', async () => {
    mockMyProjects([CURRENT_PROJECT]);
    mockProject();
    const { panel, router } = await openSwitcher('/projects/WEB/board', /^Project WEB/);

    await userEvent.click(within(panel).getByRole('option', { name: 'View all projects' }));

    expect(router.state.location.pathname).toBe('/projects');
  });

  it('PRJ-2: a user without projects sees only "Create project", which opens its popup', async () => {
    mockMyProjects([]);
    const { panel, trigger } = await openSwitcher('/my-work');

    const createButton = await within(panel).findByRole('button', { name: 'Create project' });
    expect(createButton).toHaveFocus();
    expect(within(panel).queryByRole('combobox')).not.toBeInTheDocument();
    expect(within(panel).queryByRole('option')).not.toBeInTheDocument();

    await userEvent.click(createButton);
    const popup = await screen.findByRole('dialog', { name: 'Create project' });
    await userEvent.click(within(popup).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });

  it('PRJ-2: the project made from the dropdown opens its board and the popup closes', async () => {
    mockMyProjects([CURRENT_PROJECT]);
    mockProject({ ...TEST_PROJECT, key: 'NEW', name: 'New Project' });
    const { panel, router } = await openSwitcher('/my-work');
    await userEvent.click(await within(panel).findByRole('option', { name: 'Create project' }));
    const popup = await screen.findByRole('dialog', { name: 'Create project' });
    server.use(
      http.post('/api/projects', () =>
        HttpResponse.json({ ...TEST_PROJECT, key: 'NEW', name: 'New Project' }, { status: 201 }),
      ),
    );

    await userEvent.type(within(popup).getByLabelText('Name'), 'New Project');
    await userEvent.click(within(popup).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/projects/NEW/board');
    });
    expect(screen.queryByRole('dialog', { name: 'Create project' })).not.toBeInTheDocument();
  });
});
