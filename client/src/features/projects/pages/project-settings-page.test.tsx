import { Role } from '@mini-jira/shared';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { mockMembers } from '@/test/members';
import { mockProject, TEST_PROJECT } from '@/test/project';
import { renderRoute } from '@/test/render-route';
import { server } from '@/test/server';
import { mockLoggedIn } from '@/test/session';

const MEMBER_PROJECT = { ...TEST_PROJECT, role: Role.MEMBER };

function projectTabs(): HTMLElement {
  return screen.getByRole('navigation', { name: 'Project' });
}

describe('Project header and settings page', () => {
  it('PRJ-3: the owner sees Board, List, and Settings tabs, with Settings marked as current', async () => {
    mockLoggedIn();
    mockProject();
    mockMembers();

    renderRoute('/projects/WEB/settings');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'WEB Website Redesign' }),
    ).toBeInTheDocument();
    const tabs = within(projectTabs()).getAllByRole('link');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Board', 'List', 'Settings']);
    expect(within(projectTabs()).getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(projectTabs()).getByRole('link', { name: 'Board' })).toHaveAttribute(
      'href',
      '/projects/WEB/board',
    );
  });

  it('PRJ-3: the owner sees the project details, members, and danger zone sections', async () => {
    mockLoggedIn();
    mockProject({ ...TEST_PROJECT, description: 'New company website' });
    mockMembers();

    renderRoute('/projects/WEB/settings');

    const details = await screen.findByRole('region', { name: 'Project details' });
    expect(within(details).getByLabelText('Name')).toHaveValue('Website Redesign');
    expect(within(details).getByLabelText('Description')).toHaveValue('New company website');
    expect(
      within(details).getByText("Can't be changed — it's part of every ticket key (WEB-12)"),
    ).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Members (2)' })).toBeInTheDocument();
    const dangerZone = screen.getByRole('region', { name: 'Danger zone' });
    expect(within(dangerZone).getByText('Delete this project')).toBeInTheDocument();
    expect(document.title).toBe('WEB settings · Mini-Jira');
  });

  it('PRJ-3: a member has no Settings tab', async () => {
    mockLoggedIn();
    mockProject(MEMBER_PROJECT);

    renderRoute('/projects/WEB/board');

    await screen.findByRole('heading', { level: 1, name: 'WEB Website Redesign' });
    expect(within(projectTabs()).getByRole('link', { name: 'Board' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(projectTabs()).queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
  });

  it('PRJ-3: a member who opens the settings URL sees the owner-only message and no members are loaded', async () => {
    mockLoggedIn();
    mockProject(MEMBER_PROJECT);
    let memberRequests = 0;
    server.use(
      http.get('/api/projects/:projectKey/members', () => {
        memberRequests += 1;

        return HttpResponse.json({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 });
      }),
    );

    const router = renderRoute('/projects/WEB/settings');

    expect(
      await screen.findByText('Only the project owner can open settings.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Members/ })).not.toBeInTheDocument();
    expect(memberRequests).toBe(0);

    await userEvent.click(screen.getByRole('link', { name: 'Back to the board' }));

    expect(router.state.location.pathname).toBe('/projects/WEB/board');
  });

  it('PRJ-3: the ticket page has no project tabs (wireframe 04)', async () => {
    mockLoggedIn();
    mockProject();

    renderRoute('/projects/WEB/tickets/WEB-1');

    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Project' })).not.toBeInTheDocument();
  });
});
