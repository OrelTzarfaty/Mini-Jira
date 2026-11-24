import { Role } from '@mini-jira/shared';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { createQueryClient } from '@/api/query-client';
import { PROJECTS_QUERY_KEY } from '@/api/query-keys';
import {
  buildProjectListItem,
  buildProjectListItems,
  mockMyProjects,
  mockMyProjectsError,
} from '@/test/project';
import { renderRoute } from '@/test/render-route';
import { server } from '@/test/server';
import { mockLoggedIn } from '@/test/session';

const OWNED_PROJECT = buildProjectListItem({ openTicketCount: 12 });
const JOINED_PROJECT = buildProjectListItem({
  id: '7c1e2d3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  key: 'MOB',
  name: 'Mobile App',
  role: Role.MEMBER,
  openTicketCount: 4,
});

function openMyProjects(): ReturnType<typeof renderRoute> {
  mockLoggedIn();
  // The app retries a 5xx three times with growing waits; the tests check the error state now.
  const queryClient = createQueryClient();
  queryClient.setQueryDefaults(PROJECTS_QUERY_KEY, { retry: false });

  return renderRoute('/projects', undefined, { queryClient });
}

async function findProjectList(): Promise<HTMLElement> {
  const heading = await screen.findByRole('heading', { level: 2, name: OWNED_PROJECT.name });
  const list = heading.closest('ul');

  if (!list) {
    throw new Error('The project cards are not in a list');
  }

  return list;
}

describe('MyProjectsPage', () => {
  it('PRJ-2: shows each project as a card with its key, name, my role, and open tickets', async () => {
    mockMyProjects([OWNED_PROJECT, JOINED_PROJECT]);
    openMyProjects();

    const cards = within(await findProjectList()).getAllByRole('link');

    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('WEBWebsite RedesignOwner12 open');
    expect(cards[1]).toHaveTextContent('MOBMobile AppMember4 open');
    expect(screen.getByRole('button', { name: 'Create project' })).toBeInTheDocument();
  });

  it('PRJ-2: Owner and Member look different, not only by their words', async () => {
    mockMyProjects([OWNED_PROJECT, JOINED_PROJECT]);
    openMyProjects();
    await findProjectList();

    expect(screen.getByText('Owner')).toHaveClass('text-primary', 'font-medium');
    expect(screen.getByText('Member')).toHaveClass('text-muted-foreground');
  });

  it("PRJ-2: a card opens the project's board", async () => {
    mockMyProjects([OWNED_PROJECT]);
    const router = openMyProjects();

    await userEvent.click(await screen.findByRole('link', { name: /Website Redesign/ }));

    expect(router.state.location.pathname).toBe('/projects/WEB/board');
  });

  it('PRJ-2: shows placeholder cards while the projects load', async () => {
    server.use(
      http.get('/api/projects', async () => {
        await delay('infinite');
      }),
    );
    openMyProjects();

    expect(await screen.findByText('Loading your projects')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create project' })).not.toBeInTheDocument();
  });

  it('PRJ-2: a user without projects sees the empty state, whose button opens Create project', async () => {
    mockMyProjects([]);
    openMyProjects();

    expect(await screen.findByRole('heading', { name: 'No projects yet' })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Create a project to start tracking your team's work, or ask a project owner to add you by email.",
      ),
    ).toBeInTheDocument();
    // getByRole fails if there are two: only the empty state has a "Create project" button.
    await userEvent.click(screen.getByRole('button', { name: 'Create project' }));

    expect(screen.getByRole('dialog', { name: 'Create project' })).toBeInTheDocument();
  });

  it('PRJ-2: a failed load shows an error with "Try again", which loads the projects', async () => {
    mockMyProjectsError();
    openMyProjects();

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load your projects.");
    mockMyProjects([OWNED_PROJECT]);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await findProjectList()).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('PRJ-2: "Show more" appears only with more pages, loads the next 20, and focuses the first new card', async () => {
    const projects = buildProjectListItems(25);
    const requests = mockMyProjects(projects);
    mockLoggedIn();
    renderRoute('/projects');

    const firstCard = await screen.findByRole('link', { name: /Project 1 / });
    const list = firstCard.closest('ul') ?? document.body;
    expect(within(list).getAllByRole('link')).toHaveLength(20);

    await userEvent.click(screen.getByRole('button', { name: 'Show more' }));

    expect(await screen.findByRole('link', { name: /Project 25 / })).toBeInTheDocument();
    expect(within(list).getAllByRole('link')).toHaveLength(25);
    expect(screen.getByRole('link', { name: /Project 21 / })).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
    expect(requests.map((url) => url.search)).toEqual(['?page=1', '?page=2']);
  });

  it('PRJ-2: no "Show more" when every project fits on one page', async () => {
    mockMyProjects(buildProjectListItems(20));
    mockLoggedIn();
    renderRoute('/projects');

    expect(await screen.findByRole('link', { name: /Project 20 / })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });
});
