import { ErrorCode } from '@mini-jira/shared';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import type { ReactElement } from 'react';
import type { RouteObject } from 'react-router';
import { describe, expect, it } from 'vitest';

import { createQueryClient } from '@/api/query-client';
import { PROJECTS_QUERY_KEY } from '@/api/query-keys';
import { ProjectLayout } from '@/features/projects/components/project-layout';
import { useCurrentProject } from '@/features/projects/hooks/use-project';
import { mockProject, mockProjectNotFound, TEST_PROJECT } from '@/test/project';
import { renderRoute } from '@/test/render-route';
import { server } from '@/test/server';
import { mockLoggedIn } from '@/test/session';

function ProjectName(): ReactElement {
  const project = useCurrentProject();

  return <h1>{`${project.name} (${project.role})`}</h1>;
}

// The layout alone, with one child page that reads the project from it.
const layoutRoutes: RouteObject[] = [
  {
    path: '/projects/:projectKey',
    Component: ProjectLayout,
    children: [{ path: 'board', Component: ProjectName }],
  },
  { path: '/projects', Component: () => <h1>My Projects</h1> },
];

describe('ProjectLayout', () => {
  it('PRJ-6: shows a loading skeleton while the project loads', async () => {
    server.use(
      http.get('/api/projects/:projectKey', async () => {
        await delay('infinite');
      }),
    );

    renderRoute('/projects/WEB/board', layoutRoutes);

    expect(await screen.findByRole('status')).toHaveTextContent('Loading the project');
  });

  it('PRJ-6: a member sees the page, which gets the project from the layout', async () => {
    mockProject();

    renderRoute('/projects/WEB/board', layoutRoutes);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Website Redesign (OWNER)' }),
    ).toBeInTheDocument();
  });

  it('PRJ-6: a 404 (missing project or not a member) shows "Project not found" in the app', async () => {
    mockLoggedIn();
    mockProjectNotFound();

    renderRoute('/projects/WEB/board');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Project not found' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("It may have been deleted, or you don't have access to it."),
    ).toBeInTheDocument();
    expect(document.title).toBe('Project not found · Mini-Jira');
    // The child page never renders, so nothing about the project shows.
    expect(screen.queryByRole('heading', { name: 'WEB board' })).not.toBeInTheDocument();
    expect(screen.queryByText(TEST_PROJECT.name)).not.toBeInTheDocument();
  });

  it('PRJ-6: "Back to My Projects" goes to /projects', async () => {
    mockProjectNotFound();

    const router = renderRoute('/projects/WEB/board', layoutRoutes);
    await userEvent.click(await screen.findByRole('link', { name: 'Back to My Projects' }));

    expect(router.state.location.pathname).toBe('/projects');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'My Projects' }),
    ).toBeInTheDocument();
  });

  it('PRJ-6: a server error shows an error with "Try again", which loads the project', async () => {
    let requests = 0;
    server.use(
      http.get('/api/projects/:projectKey', () => {
        requests += 1;

        return requests === 1
          ? HttpResponse.json(
              { error: { code: ErrorCode.INTERNAL_ERROR, message: 'Something went wrong' } },
              { status: 500 },
            )
          : HttpResponse.json(TEST_PROJECT);
      }),
    );
    // The app retries a 5xx three times with growing waits; the test checks the error state now.
    const queryClient = createQueryClient();
    queryClient.setQueryDefaults(PROJECTS_QUERY_KEY, { retry: false });

    renderRoute('/projects/WEB/board', layoutRoutes, { queryClient });

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load this project.");
    expect(screen.queryByText(TEST_PROJECT.name, { exact: false })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Website Redesign (OWNER)' }),
    ).toBeInTheDocument();
    expect(requests).toBe(2);
  });

  it('PRJ-6: asks for the project with its key from the URL, encoded', async () => {
    let requestedPath = '';
    server.use(
      http.get('/api/projects/:projectKey', ({ request }) => {
        requestedPath = new URL(request.url).pathname;

        return HttpResponse.json({ ...TEST_PROJECT, key: 'W B' });
      }),
    );

    renderRoute('/projects/W%20B/board', layoutRoutes);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Website Redesign (OWNER)' }),
    ).toBeInTheDocument();
    expect(requestedPath).toBe('/api/projects/W%20B');
  });
});
