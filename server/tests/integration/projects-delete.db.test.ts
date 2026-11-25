import {
  ErrorCode,
  PROJECT_NOT_FOUND_MESSAGE,
  PROJECT_OWNER_ONLY_MESSAGE,
  UNAUTHENTICATED_MESSAGE,
} from '@mini-jira/shared';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createProjectsService } from '../../src/modules/projects/projects.service.js';
import { resetDatabase, testPrisma } from '../helpers/database.js';
import {
  createProjectAccessMatrix,
  requestAs,
  type Caller,
  type ProjectAccessMatrix,
} from '../helpers/project-access-matrix.js';
import { createTestApp } from '../helpers/test-app.js';

const NOT_FOUND_BODY = {
  error: { code: ErrorCode.NOT_FOUND, message: PROJECT_NOT_FOUND_MESSAGE },
};

describe('DELETE /api/projects/:projectKey (PRJ-5)', () => {
  let app: ReturnType<typeof createTestApp>;
  let matrix: ProjectAccessMatrix;

  beforeEach(async () => {
    await resetDatabase();
    matrix = await createProjectAccessMatrix();
    app = createTestApp();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  const projectUrl = (): string => `/api/projects/${matrix.project.key}`;
  const deleteProject = (caller: Caller): request.Test =>
    requestAs(app, matrix, caller, 'delete', projectUrl());
  const projectExists = async (): Promise<boolean> =>
    (await testPrisma.project.count({ where: { id: matrix.project.id } })) === 1;

  it('PRJ-5: the owner deletes the project (204, no body) with all its memberships', async () => {
    const response = await deleteProject('owner');

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(await projectExists()).toBe(false);
    expect(await testPrisma.projectMember.count({ where: { projectId: matrix.project.id } })).toBe(
      0,
    );
    // Only the project goes; the users' accounts stay.
    const userIds = [matrix.owner.id, matrix.member.id];
    expect(await testPrisma.user.count({ where: { id: { in: userIds } } })).toBe(2);
  });

  it.each(['owner', 'member'] as const)(
    'PRJ-5: after the delete, GET returns 404 for the former %s',
    async (caller) => {
      await deleteProject('owner');

      const response = await requestAs(app, matrix, caller, 'get', projectUrl());

      expect(response.status).toBe(404);
      expect(response.body).toEqual(NOT_FOUND_BODY);
    },
  );

  it('PRJ-5: the deleted project is no longer in My Projects', async () => {
    await deleteProject('owner');

    const response = await requestAs(app, matrix, 'member', 'get', '/api/projects');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ items: [], total: 0 });
  });

  it('PRJ-5: deleting it again gets 404', async () => {
    await deleteProject('owner');

    const response = await deleteProject('owner');

    expect(response.status).toBe(404);
    expect(response.body).toEqual(NOT_FOUND_BODY);
  });

  it('PRJ-5: only this project is deleted; another project and its owner stay', async () => {
    const other = await createProjectsService(testPrisma).createProject(matrix.owner.id, {
      key: 'API',
      name: 'Backend',
      description: null,
    });

    await deleteProject('owner');

    expect(await testPrisma.project.count({ where: { id: other.id } })).toBe(1);
    expect(await testPrisma.projectMember.count({ where: { projectId: other.id } })).toBe(1);
  });

  it('PRJ-5: the service gets 404 when a parallel request already deleted the project', async () => {
    await testPrisma.project.delete({ where: { id: matrix.project.id } });

    await expect(
      createProjectsService(testPrisma).deleteProject(matrix.project.id),
    ).rejects.toMatchObject({ status: 404, code: ErrorCode.NOT_FOUND });
  });

  it('PRJ-5: a member gets 403 and the project stays', async () => {
    const response = await deleteProject('member');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: { code: ErrorCode.FORBIDDEN, message: PROJECT_OWNER_ONLY_MESSAGE },
    });
    expect(await projectExists()).toBe(true);
  });

  it('PRJ-5: an outsider gets 404 and the project stays', async () => {
    const response = await deleteProject('outsider');

    expect(response.status).toBe(404);
    expect(response.body).toEqual(NOT_FOUND_BODY);
    expect(await projectExists()).toBe(true);
  });

  it('PRJ-5: a visitor gets 401 and the project stays', async () => {
    const response = await deleteProject('visitor');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: { code: ErrorCode.UNAUTHENTICATED, message: UNAUTHENTICATED_MESSAGE },
    });
    expect(await projectExists()).toBe(true);
  });

  it('PRJ-5: a cross-site request from the owner gets 403 and the project stays', async () => {
    const response = await request(app)
      .delete(projectUrl())
      .set('Cookie', matrix.cookies.owner ?? '')
      .set('Sec-Fetch-Site', 'cross-site');

    expect(response.status).toBe(403);
    expect(await projectExists()).toBe(true);
  });
});
