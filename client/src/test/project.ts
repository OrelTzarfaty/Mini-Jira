import { ErrorCode, Role } from '@mini-jira/shared';
import type { Project } from '@mini-jira/shared';
import { http, HttpResponse } from 'msw';

import { server } from './server';

/** The project that project-page tests open (wireframe 03 uses WEB). */
export const TEST_PROJECT: Project = {
  id: '2b7e4c1a-9d3f-4a6b-8c5e-1f0a2b3c4d5e',
  key: 'WEB',
  name: 'Website Redesign',
  description: null,
  role: Role.OWNER,
  createdAt: '2026-11-20T09:00:00.000Z',
  updatedAt: '2026-11-20T09:00:00.000Z',
};

/** Makes GET /api/projects/:projectKey answer with the project, as for a member (PRJ-6). */
export function mockProject(project: Project = TEST_PROJECT): void {
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
