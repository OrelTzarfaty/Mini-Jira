import { ErrorCode, PAGE_SIZE, projectSchema, Role } from '@mini-jira/shared';
import type { ProjectDetail, ProjectListItem } from '@mini-jira/shared';
import { http, HttpResponse } from 'msw';

import { server } from './server';

/** The project that project-page tests open (wireframe 03 uses WEB). */
export const TEST_PROJECT: ProjectDetail = {
  id: '2b7e4c1a-9d3f-4a6b-8c5e-1f0a2b3c4d5e',
  key: 'WEB',
  name: 'Website Redesign',
  description: null,
  role: Role.OWNER,
  createdAt: '2026-11-20T09:00:00.000Z',
  updatedAt: '2026-11-20T09:00:00.000Z',
  ticketCount: 0,
};

/** Makes GET /api/projects/:projectKey answer with the project, as for a member (PRJ-6). */
export function mockProject(project: ProjectDetail = TEST_PROJECT): void {
  server.use(http.get(`/api/projects/${project.key}`, () => HttpResponse.json(project)));
}

/**
 * Makes GET /api/projects/:projectKey answer 404, as the API does both for a missing project
 * and for one the user isn't a member of (PRJ-6).
 */
export function mockProjectNotFound(): void {
  server.use(
    http.get('/api/projects/:projectKey', () =>
      HttpResponse.json(
        { error: { code: ErrorCode.NOT_FOUND, message: 'Project not found' } },
        { status: 404 },
      ),
    ),
  );
}

/** A project as My Projects lists it (PRJ-2), based on TEST_PROJECT. */
export function buildProjectListItem(overrides: Partial<ProjectListItem> = {}): ProjectListItem {
  // Parsed, so the detail's ticketCount is dropped: the list has open tickets instead.
  return { ...projectSchema.parse(TEST_PROJECT), openTicketCount: 0, ...overrides };
}

/** `count` projects with keys AA, AB, ... and names "Project 1", "Project 2", ... */
export function buildProjectListItems(count: number): ProjectListItem[] {
  const firstLetter = 'A'.charCodeAt(0);

  return Array.from({ length: count }, (_, index) =>
    buildProjectListItem({
      id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      key: `A${String.fromCharCode(firstLetter + index)}`,
      name: `Project ${String(index + 1)}`,
    }),
  );
}

/**
 * Makes GET /api/projects answer like the API (PRJ-2): `q` matches the name or key (any case),
 * then 20 per page. Returns the URLs it was asked for, so a test can check the query string.
 */
export function mockMyProjects(projects: readonly ProjectListItem[]): URL[] {
  const requests: URL[] = [];

  server.use(
    http.get('/api/projects', ({ request }) => {
      const url = new URL(request.url);
      requests.push(url);
      const search = (url.searchParams.get('q') ?? '').toLowerCase();
      const page = Number(url.searchParams.get('page') ?? '1');
      const matches = projects.filter((project) =>
        `${project.name} ${project.key}`.toLowerCase().includes(search),
      );
      const start = (page - 1) * PAGE_SIZE;

      return HttpResponse.json({
        items: matches.slice(start, start + PAGE_SIZE),
        page,
        pageSize: PAGE_SIZE,
        total: matches.length,
        totalPages: Math.ceil(matches.length / PAGE_SIZE),
      });
    }),
  );

  return requests;
}

/** Makes GET /api/projects fail with a server error (PRJ-2 error states). */
export function mockMyProjectsError(): void {
  server.use(
    http.get('/api/projects', () =>
      HttpResponse.json(
        { error: { code: ErrorCode.INTERNAL_ERROR, message: 'Something went wrong' } },
        { status: 500 },
      ),
    ),
  );
}
